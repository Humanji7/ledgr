use std::fs;

use tauri::test::mock_app;

fn init_test_app() -> tauri::App<tauri::test::MockRuntime> {
    let app = mock_app();
    crate::db::init_db(app.handle()).expect("init_db failed");
    crate::db::reset_data(app.handle(), true).expect("reset_data failed");
    app
}

fn write_temp_file(dir: &tempfile::TempDir, name: &str, contents: &str) -> std::path::PathBuf {
    let p = dir.path().join(name);
    fs::write(&p, contents).expect("write temp file");
    p
}

#[test]
fn csv_parser_format_b_parses_and_hashes() {
    let dir = tempfile::tempdir().unwrap();
    let csv_path = write_temp_file(
        &dir,
        "chase.csv",
        "Transaction Date,Description,Amount\n01/15/2026,WHOLE FOODS MARKET,-45.67\n01/15/2026,Zero,0\n",
    );

    let rows = crate::csv_parser::parse_chase_csv(csv_path.to_str().unwrap()).unwrap();
    assert_eq!(rows.len(), 1, "should skip amount=0 rows");
    assert_eq!(rows[0].date, "2026-01-15");
    assert_eq!(rows[0].description, "WHOLE FOODS MARKET");
    assert!((rows[0].amount - (-45.67)).abs() < 1e-9);
    assert_eq!(rows[0].hash.len(), 64);
}

#[test]
fn csv_parser_format_a_parses() {
    let dir = tempfile::tempdir().unwrap();
    let csv_path = write_temp_file(
        &dir,
        "chase.csv",
        "Transaction Date,Post Date,Description,Category,Type,Amount,Memo\n01/15/2026,01/16/2026,STARBUCKS,Food & Drink,Sale,-6.45,\n",
    );

    let rows = crate::csv_parser::parse_chase_csv(csv_path.to_str().unwrap()).unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].date, "2026-01-15");
    assert_eq!(rows[0].description, "STARBUCKS");
    assert!((rows[0].amount - (-6.45)).abs() < 1e-9);
}

#[test]
fn builtin_rules_categorize_expected_merchants() {
    let app = init_test_app();

    // dining vs transport edge-case: "UBER EATS" should hit dining, while "UBER " hits transport.
    let d = crate::categorizer::categorize_by_rules(app.handle(), "UBER EATS", -10.0).unwrap();
    assert_eq!(d.category, "dining");
    assert_eq!(d.source, "rule");

    let t = crate::categorizer::categorize_by_rules(app.handle(), "UBER TRIP", -10.0).unwrap();
    assert_eq!(t.category, "transport");
    assert_eq!(t.source, "rule");

    let income = crate::categorizer::categorize_by_rules(app.handle(), "PAYROLL DIRECT DEP", 3500.0).unwrap();
    assert_eq!(income.category, "income");
    assert_eq!(income.source, "rule");
}

#[test]
fn custom_rules_override_builtin_rules() {
    let app = init_test_app();
    crate::db::upsert_custom_rule(app.handle(), "AMAZON.COM", "groceries").unwrap();

    let d = crate::categorizer::categorize_by_rules(app.handle(), "AMAZON.COM", -12.34).unwrap();
    assert_eq!(d.category, "groceries");
    assert_eq!(d.source, "learned_rule");
}

#[test]
fn import_works_without_model_and_marks_unknowns() {
    let app = init_test_app();

    let dir = tempfile::tempdir().unwrap();
    let csv_path = write_temp_file(
        &dir,
        "test.csv",
        "Transaction Date,Description,Amount\n01/15/2026,WHOLE FOODS MARKET,-45.67\n01/14/2026,RANDOM MERCHANT XYZ,-23.40\n",
    );

    let res = tauri::async_runtime::block_on(crate::commands::import_csv_impl(
        app.handle(),
        csv_path.to_str().unwrap(),
    ))
    .unwrap();

    assert_eq!(res.imported, 2);
    assert_eq!(res.llm_used, 0);
    assert!(res.errors.iter().any(|e| e.to_lowercase().contains("model not configured")));

    let txns = crate::db::get_transactions(app.handle()).unwrap();
    assert_eq!(txns.len(), 2);

    let wf = txns.iter().find(|t| t.description == "WHOLE FOODS MARKET").unwrap();
    assert_eq!(wf.category, "groceries");
    assert_eq!(wf.category_source, "rule");

    let unk = txns.iter().find(|t| t.description == "RANDOM MERCHANT XYZ").unwrap();
    assert_eq!(unk.category, "other");
    assert_eq!(unk.category_source, "unknown");
    assert_eq!(unk.category_reason, "NO_MODEL");
}

#[test]
fn update_category_respects_auto_learn_toggle() {
    let app = init_test_app();

    // Import one unknown transaction so we have an id to update.
    let dir = tempfile::tempdir().unwrap();
    let csv_path = write_temp_file(
        &dir,
        "test.csv",
        "Transaction Date,Description,Amount\n01/14/2026,RANDOM MERCHANT XYZ,-23.40\n",
    );
    tauri::async_runtime::block_on(crate::commands::import_csv_impl(
        app.handle(),
        csv_path.to_str().unwrap(),
    ))
    .unwrap();

    let txn = crate::db::get_transactions(app.handle()).unwrap().pop().unwrap();

    // Disable auto-learn and update: should not create a custom rule.
    crate::commands::set_auto_learn_rules_impl(app.handle(), false).unwrap();

    tauri::async_runtime::block_on(crate::commands::update_category_impl(
        app.handle(),
        &txn.id,
        "dining",
    ))
    .unwrap();

    let pattern = "RANDOM MERCHANT XYZ".to_string();
    let rule = crate::db::get_custom_rule(app.handle(), &pattern).unwrap();
    assert!(rule.is_none(), "auto learn disabled: should not create rule");

    // Enable auto-learn and update: should create custom rule.
    crate::commands::set_auto_learn_rules_impl(app.handle(), true).unwrap();

    tauri::async_runtime::block_on(crate::commands::update_category_impl(
        app.handle(),
        &txn.id,
        "shopping",
    ))
    .unwrap();

    let rule2 = crate::db::get_custom_rule(app.handle(), &pattern).unwrap();
    assert_eq!(rule2.as_deref(), Some("shopping"));
}

#[test]
fn filtered_queries_and_search_work() {
    let app = init_test_app();
    let dir = tempfile::tempdir().unwrap();
    let csv_path = write_temp_file(
        &dir,
        "test.csv",
        "Transaction Date,Description,Amount\n01/15/2026,WHOLE FOODS MARKET,-45.67\n01/14/2026,STARBUCKS,-6.45\n12/31/2025,NETFLIX.COM,-15.99\n",
    );
    tauri::async_runtime::block_on(crate::commands::import_csv_impl(
        app.handle(),
        csv_path.to_str().unwrap(),
    ))
    .unwrap();

    // Date range should include only Jan 2026 rows.
    let jan = crate::db::get_transactions_filtered(app.handle(), Some("2026-01-01"), Some("2026-01-31"), None, None).unwrap();
    assert_eq!(jan.len(), 2);

    // Category filter (dining) should find STARBUCKS.
    let dining = crate::db::get_transactions_filtered(app.handle(), None, None, Some("dining"), None).unwrap();
    assert_eq!(dining.len(), 1);
    assert_eq!(dining[0].description, "STARBUCKS");

    // Search should match description and category.
    let q = crate::db::get_transactions_filtered(app.handle(), None, None, None, Some("netflix")).unwrap();
    assert_eq!(q.len(), 1);
    assert_eq!(q[0].description, "NETFLIX.COM");
}

#[test]
fn budgets_status_calculates_spent_and_percent() {
    let app = init_test_app();

    // Insert two dining expenses in Jan 2026.
    let dir = tempfile::tempdir().unwrap();
    let csv_path = write_temp_file(
        &dir,
        "test.csv",
        "Transaction Date,Description,Amount\n01/14/2026,STARBUCKS,-6.45\n01/20/2026,CHIPOTLE,-20.00\n",
    );
    tauri::async_runtime::block_on(crate::commands::import_csv_impl(
        app.handle(),
        csv_path.to_str().unwrap(),
    ))
    .unwrap();

    crate::db::set_budget(app.handle(), "dining", 100.0).unwrap();

    let status = crate::db::get_budget_status(app.handle(), "2026-01").unwrap();
    let dining = status.iter().find(|s| s.category == "dining").unwrap();

    assert!((dining.spent - 26.45).abs() < 1e-6);
    assert!((dining.remaining - 73.55).abs() < 1e-6);
    assert!((dining.percent_used - 26.45).abs() < 1e-6);
}

#[test]
fn export_csv_writes_valid_csv_with_escaping() {
    let app = init_test_app();

    // Insert a transaction with quotes to verify escaping.
    let t = crate::Transaction {
        id: "t1".to_string(),
        date: "2026-01-15".to_string(),
        description: "ACME \"Widgets\"".to_string(),
        amount: -12.3,
        category: "shopping".to_string(),
        category_source: "manual".to_string(),
        category_reason: "manual".to_string(),
        source_file: "x.csv".to_string(),
        hash: "h1".to_string(),
        created_at: "2026-01-15T00:00:00Z".to_string(),
    };
    crate::db::insert_transactions(app.handle(), &[t]).unwrap();

    let dir = tempfile::tempdir().unwrap();
    let out_path = dir.path().join("export.csv");

    let count = tauri::async_runtime::block_on(crate::commands::export_csv_impl(
        app.handle(),
        out_path.to_str().unwrap(),
        None,
        None,
    ))
    .unwrap();

    assert_eq!(count, 1);
    let content = fs::read_to_string(&out_path).unwrap();
    assert!(content.starts_with("Date,Description,Amount,Category\n"));
    assert!(content.contains("2026-01-15,\"ACME \"\"Widgets\"\"\",-12.30,shopping\n"));
}
