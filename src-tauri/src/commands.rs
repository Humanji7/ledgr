use crate::{Budget, BudgetStatus, CustomRule, ImportResult, Stats, Transaction, VALID_CATEGORIES};
use chrono::Utc;
use serde::Serialize;
use tauri::{Emitter, Runtime};
use uuid::Uuid;

#[tauri::command]
pub async fn check_model_setup(app: tauri::AppHandle) -> Result<bool, String> {
    let path_opt = crate::db::get_setting(&app, "model_path")?;
    let Some(path) = path_opt else { return Ok(false) };
    let exists = std::path::Path::new(&path).exists();
    Ok(exists)
}

#[tauri::command]
pub async fn set_model_path(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Err("model file does not exist".to_string());
    }
    crate::db::set_setting(&app, "model_path", &path)?;
    Ok(())
}

#[tauri::command]
pub async fn get_language(app: tauri::AppHandle) -> Result<String, String> {
    let raw = crate::db::get_setting(&app, "language")?.unwrap_or_else(|| "en".to_string());
    let v = raw.trim().to_lowercase();
    if v == "ru" { Ok("ru".to_string()) } else { Ok("en".to_string()) }
}

#[tauri::command]
pub async fn set_language(app: tauri::AppHandle, language: String) -> Result<(), String> {
    let v = language.trim().to_lowercase();
    if v != "en" && v != "ru" {
        return Err("invalid language".to_string());
    }
    crate::db::set_setting(&app, "language", &v)?;
    Ok(())
}

pub fn get_auto_learn_rules_impl<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<bool, String> {
    let raw = crate::db::get_setting(app, "auto_learn_rules")?.unwrap_or_else(|| "true".to_string());
    let v = raw.trim().to_lowercase();
    Ok(v != "false" && v != "0" && v != "no")
}

pub fn set_auto_learn_rules_impl<R: Runtime>(app: &tauri::AppHandle<R>, enabled: bool) -> Result<(), String> {
    crate::db::set_setting(app, "auto_learn_rules", if enabled { "true" } else { "false" })?;
    Ok(())
}

#[tauri::command]
pub async fn get_auto_learn_rules(app: tauri::AppHandle) -> Result<bool, String> {
    get_auto_learn_rules_impl(&app)
}

#[tauri::command]
pub async fn set_auto_learn_rules(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    set_auto_learn_rules_impl(&app, enabled)
}

#[tauri::command]
pub async fn reset_data(app: tauri::AppHandle, keep_model_path: Option<bool>) -> Result<(), String> {
    crate::db::reset_data(&app, keep_model_path.unwrap_or(true))
}

#[derive(Debug, Clone, Serialize)]
struct ImportProgressEvent {
    stage: String,
    processed: u32,
    total: u32,
    duplicates_skipped: u32,
    rules_used: u32,
    llm_used: u32,
}

fn emit_import_progress<R: Runtime>(app: &tauri::AppHandle<R>, event: ImportProgressEvent) {
    let _ = app.emit("ledgr://import-progress", event);
}

pub async fn import_csv_impl<R: Runtime>(
    app: &tauri::AppHandle<R>,
    path: &str,
) -> Result<ImportResult, String> {
    emit_import_progress(
        app,
        ImportProgressEvent {
            stage: "parsing".to_string(),
            processed: 0,
            total: 0,
            duplicates_skipped: 0,
            rules_used: 0,
            llm_used: 0,
        },
    );

    let parsed = crate::csv_parser::parse_chase_csv(path)?;

    let file_name = std::path::Path::new(path)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("import.csv")
        .to_string();

    let mut duplicates_skipped: u32 = 0;
    let mut to_process = Vec::new();
    let mut seen_hashes: std::collections::HashSet<String> = std::collections::HashSet::new();
    for p in parsed {
        if !seen_hashes.insert(p.hash.clone()) {
            duplicates_skipped += 1;
            continue;
        }
        if crate::db::hash_exists(app, &p.hash)? {
            duplicates_skipped += 1;
            continue;
        }
        to_process.push(p);
    }

    emit_import_progress(
        app,
        ImportProgressEvent {
            stage: "dedup".to_string(),
            processed: (seen_hashes.len().saturating_sub(to_process.len())) as u32,
            total: (seen_hashes.len()) as u32,
            duplicates_skipped,
            rules_used: 0,
            llm_used: 0,
        },
    );

    let model_path_opt = crate::db::get_setting(app, "model_path")?;
    let model_path = model_path_opt
        .filter(|p| std::path::Path::new(p).exists());

    let mut categorized: Vec<Transaction> = Vec::new();
    let mut errors: Vec<String> = Vec::new();
    let mut rules_used: u32 = 0;
    let mut llm_used: u32 = 0;
    let used_model: bool = model_path.is_some();
    if !used_model {
        errors.push("Model not configured; unknown transactions will be categorized as 'other' (rules-only mode).".to_string());
    }

    // Simple in-memory cache: exact description → category (helps repeated merchants during import).
    let mut cache: std::collections::HashMap<String, String> = std::collections::HashMap::new();

    let total = to_process.len() as u32;
    let mut processed: u32 = 0;
    for p in to_process {
        let decision = if let Some(d) = crate::categorizer::categorize_by_rules(app, &p.description, p.amount) {
            rules_used += 1;
            d
        } else if let Some(mp) = model_path.as_deref() {
            if let Some(cached) = cache.get(&p.description) {
                llm_used += 1;
                crate::categorizer::CategoryDecision {
                    category: cached.clone(),
                    source: "llm".to_string(),
                    reason: "LLM:CACHE".to_string(),
                }
            } else {
                llm_used += 1;
                match crate::llm::categorize_with_llm(app, mp, &p.description, p.amount).await {
                    Ok(cat) => {
                        cache.insert(p.description.clone(), cat.clone());
                        crate::categorizer::CategoryDecision {
                            category: cat,
                            source: "llm".to_string(),
                            reason: "LLM".to_string(),
                        }
                    }
                    Err(e) => {
                        errors.push(format!("LLM failed for '{}': {}", p.description, e));
                        crate::categorizer::CategoryDecision {
                            category: "other".to_string(),
                            source: "llm".to_string(),
                            reason: "LLM_ERROR".to_string(),
                        }
                    }
                }
            }
        } else {
            crate::categorizer::CategoryDecision {
                category: "other".to_string(),
                source: "unknown".to_string(),
                reason: "NO_MODEL".to_string(),
            }
        };

        let normalized_category = if VALID_CATEGORIES.contains(&decision.category.as_str()) {
            decision.category
        } else {
            "other".to_string()
        };

        let created_at = Utc::now().to_rfc3339();
        categorized.push(Transaction {
            id: Uuid::new_v4().to_string(),
            date: p.date,
            description: p.description,
            amount: p.amount,
            category: normalized_category,
            category_source: decision.source,
            category_reason: decision.reason,
            source_file: file_name.clone(),
            hash: p.hash,
            created_at,
        });

        processed += 1;
        if processed == 1 || processed % 25 == 0 || processed == total {
            emit_import_progress(
                app,
                ImportProgressEvent {
                    stage: "categorizing".to_string(),
                    processed,
                    total,
                    duplicates_skipped,
                    rules_used,
                    llm_used,
                },
            );
        }
    }

    let mut imported: u32 = 0;
    if !categorized.is_empty() {
        emit_import_progress(
            app,
            ImportProgressEvent {
                stage: "inserting".to_string(),
                processed: 0,
                total: categorized.len() as u32,
                duplicates_skipped,
                rules_used,
                llm_used,
            },
        );
        let inserted = crate::db::insert_transactions(app, &categorized)
            .map_err(|e| format!("db insert failed: {e}"))?;
        imported = inserted;
        // Any rows ignored at insert time are duplicates (e.g. race with another import).
        let ignored = categorized.len().saturating_sub(inserted as usize) as u32;
        duplicates_skipped = duplicates_skipped.saturating_add(ignored);
    }

    emit_import_progress(
        app,
        ImportProgressEvent {
            stage: "done".to_string(),
            processed: imported,
            total,
            duplicates_skipped,
            rules_used,
            llm_used,
        },
    );

    Ok(ImportResult {
        imported,
        duplicates_skipped,
        rules_used,
        llm_used,
        errors,
    })
}

#[tauri::command]
pub async fn import_csv(app: tauri::AppHandle, path: String) -> Result<ImportResult, String> {
    import_csv_impl(&app, &path).await
}

#[tauri::command]
pub async fn get_transactions(app: tauri::AppHandle) -> Result<Vec<Transaction>, String> {
    crate::db::get_transactions(&app)
}

#[tauri::command]
pub async fn get_transactions_filtered(
    app: tauri::AppHandle,
    start_date: Option<String>,
    end_date: Option<String>,
    category: Option<String>,
    search: Option<String>,
) -> Result<Vec<Transaction>, String> {
    crate::db::get_transactions_filtered(
        &app,
        start_date.as_deref(),
        end_date.as_deref(),
        category.as_deref(),
        search.as_deref(),
    )
}

#[tauri::command]
pub async fn get_available_months(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    crate::db::get_available_months(&app)
}

#[tauri::command]
pub async fn update_category(app: tauri::AppHandle, id: String, category: String) -> Result<(), String> {
    update_category_impl(&app, &id, &category).await
}

pub async fn update_category_impl<R: Runtime>(
    app: &tauri::AppHandle<R>,
    id: &str,
    category: &str,
) -> Result<(), String> {
    if !VALID_CATEGORIES.contains(&category) {
        return Err("invalid category".to_string());
    }

    let txn = crate::db::get_transaction_by_id(app, id)?
        .ok_or_else(|| "transaction not found".to_string())?;

    crate::db::update_category(app, id, category)?;

    let auto_learn = get_auto_learn_rules_impl(app).unwrap_or(true);
    if auto_learn {
        let pattern = txn.description.trim().to_uppercase();
        crate::db::upsert_custom_rule(app, &pattern, category)?;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_stats(app: tauri::AppHandle) -> Result<Stats, String> {
    crate::db::get_stats(&app)
}

#[tauri::command]
pub async fn get_stats_filtered(
    app: tauri::AppHandle,
    start_date: Option<String>,
    end_date: Option<String>,
    category: Option<String>,
    search: Option<String>,
) -> Result<Stats, String> {
    crate::db::get_stats_filtered(
        &app,
        start_date.as_deref(),
        end_date.as_deref(),
        category.as_deref(),
        search.as_deref(),
    )
}

#[tauri::command]
pub async fn set_budget(app: tauri::AppHandle, category: String, monthly_limit: f64) -> Result<(), String> {
    if category == "income" || category == "transfer" {
        return Err("budgets are only supported for expense categories".to_string());
    }
    if monthly_limit < 0.0 {
        return Err("monthly_limit must be >= 0".to_string());
    }
    crate::db::set_budget(&app, &category, monthly_limit)
}

#[tauri::command]
pub async fn get_budgets(app: tauri::AppHandle) -> Result<Vec<Budget>, String> {
    crate::db::get_budgets(&app)
}

#[tauri::command]
pub async fn delete_budget(app: tauri::AppHandle, category: String) -> Result<(), String> {
    crate::db::delete_budget(&app, &category)
}

#[tauri::command]
pub async fn get_budget_status(app: tauri::AppHandle, month: String) -> Result<Vec<BudgetStatus>, String> {
    crate::db::get_budget_status(&app, &month)
}

#[tauri::command]
pub async fn export_csv(
    app: tauri::AppHandle,
    path: String,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<u32, String> {
    export_csv_impl(&app, &path, start_date.as_deref(), end_date.as_deref()).await
}

pub async fn export_csv_impl<R: Runtime>(
    app: &tauri::AppHandle<R>,
    path: &str,
    start_date: Option<&str>,
    end_date: Option<&str>,
) -> Result<u32, String> {
    use std::fs::File;
    use std::io::Write;

    let transactions = crate::db::get_transactions_filtered(
        app,
        start_date,
        end_date,
        None,
        None,
    )?;

    let mut file = File::create(path).map_err(|e| e.to_string())?;
    writeln!(file, "Date,Description,Amount,Category").map_err(|e| e.to_string())?;

    for t in &transactions {
        let escaped_desc = t.description.replace('"', "\"\"");
        writeln!(
            file,
            "{},\"{escaped_desc}\",{:.2},{}",
            t.date,
            t.amount,
            t.category
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(transactions.len() as u32)
}

#[tauri::command]
pub async fn get_custom_rules(app: tauri::AppHandle) -> Result<Vec<CustomRule>, String> {
    crate::db::get_all_custom_rules(&app)
}

#[tauri::command]
pub async fn delete_custom_rule(app: tauri::AppHandle, id: String) -> Result<(), String> {
    crate::db::delete_custom_rule(&app, &id)
}
