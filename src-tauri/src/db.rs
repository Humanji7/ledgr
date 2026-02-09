use crate::{Budget, BudgetStatus, CustomRule, Stats, Transaction, VALID_CATEGORIES};
use rusqlite::{
    params, params_from_iter,
    types::Value,
    Connection, OptionalExtension,
};
use tauri::Manager;
use uuid::Uuid;

fn open_connection<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<Connection, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let db_path = app_dir.join("ledgr.db");
    Connection::open(db_path).map_err(|e| e.to_string())
}

pub fn init_db<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let conn = open_connection(app).map_err(|e| format!("db open failed: {e}"))?;

    conn.execute_batch(
        r#"
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    category_source TEXT NOT NULL DEFAULT 'unknown',
    category_reason TEXT NOT NULL DEFAULT '',
    source_file TEXT,
    hash TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_hash ON transactions(hash);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_rules (
    id TEXT PRIMARY KEY,
    pattern TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    hit_count INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_custom_rules_pattern ON custom_rules(pattern);

CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL UNIQUE,
    monthly_limit REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
"#,
    )?;

    ensure_transactions_column(&conn, "category_source", "TEXT NOT NULL DEFAULT 'unknown'")?;
    ensure_transactions_column(&conn, "category_reason", "TEXT NOT NULL DEFAULT ''")?;

    Ok(())
}

fn ensure_transactions_column(
    conn: &Connection,
    name: &str,
    sql_type_and_default: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut stmt = conn.prepare("PRAGMA table_info(transactions)")?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let col_name: String = row.get(1)?;
        if col_name == name {
            return Ok(());
        }
    }

    conn.execute(
        &format!("ALTER TABLE transactions ADD COLUMN {name} {sql_type_and_default}"),
        [],
    )?;
    Ok(())
}

pub fn reset_data<R: tauri::Runtime>(app: &tauri::AppHandle<R>, keep_model_path: bool) -> Result<(), String> {
    let mut conn = open_connection(app)?;
    let txn = conn.transaction().map_err(|e| e.to_string())?;

    txn.execute("DELETE FROM transactions", params![])
        .map_err(|e| e.to_string())?;
    txn.execute("DELETE FROM custom_rules", params![])
        .map_err(|e| e.to_string())?;
    txn.execute("DELETE FROM budgets", params![])
        .map_err(|e| e.to_string())?;

    if keep_model_path {
        txn.execute("DELETE FROM settings WHERE key NOT IN ('model_path', 'language')", params![])
            .map_err(|e| e.to_string())?;
    } else {
        txn.execute("DELETE FROM settings", params![])
            .map_err(|e| e.to_string())?;
    }

    txn.commit().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_setting<R: tauri::Runtime>(app: &tauri::AppHandle<R>, key: &str) -> Result<Option<String>, String> {
    let conn = open_connection(app)?;
    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params![key]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(row.get::<_, String>(0).map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}

pub fn set_setting<R: tauri::Runtime>(app: &tauri::AppHandle<R>, key: &str, value: &str) -> Result<(), String> {
    let conn = open_connection(app)?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn hash_exists<R: tauri::Runtime>(app: &tauri::AppHandle<R>, hash: &str) -> Result<bool, String> {
    let conn = open_connection(app)?;
    let exists: i64 = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM transactions WHERE hash = ?1)",
            params![hash],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(exists == 1)
}

pub fn insert_transactions<R: tauri::Runtime>(app: &tauri::AppHandle<R>, txns: &[Transaction]) -> Result<u32, String> {
    let mut conn = open_connection(app)?;
    let txn = conn.transaction().map_err(|e| e.to_string())?;
    let mut inserted: u32 = 0;
    {
        let mut stmt = txn
            .prepare(
                "INSERT OR IGNORE INTO transactions (id, date, description, amount, category, category_source, category_reason, source_file, hash, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            )
            .map_err(|e| e.to_string())?;
        for t in txns {
            let changed = stmt
                .execute(params![
                t.id,
                t.date,
                t.description,
                t.amount,
                t.category,
                t.category_source,
                t.category_reason,
                t.source_file,
                t.hash,
                t.created_at
            ])
                .map_err(|e| e.to_string())?;
            inserted += changed as u32;
        }
    }
    txn.commit().map_err(|e| e.to_string())?;
    Ok(inserted)
}

pub fn get_transactions<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<Vec<Transaction>, String> {
    get_transactions_filtered(app, None, None, None, None)
}

pub fn update_category<R: tauri::Runtime>(app: &tauri::AppHandle<R>, id: &str, category: &str) -> Result<(), String> {
    if !VALID_CATEGORIES.contains(&category) {
        return Err("invalid category".to_string());
    }

    let conn = open_connection(app)?;
    conn.execute(
        "UPDATE transactions
         SET category = ?1, category_source = 'manual', category_reason = 'manual'
         WHERE id = ?2",
        params![category, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_stats<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<Stats, String> {
    get_stats_filtered(app, None, None, None, None)
}

fn build_filters_where_clause(
    start_date: Option<&str>,
    end_date: Option<&str>,
    category: Option<&str>,
    search: Option<&str>,
) -> (String, Vec<Value>) {
    let mut parts: Vec<String> = Vec::new();
    let mut params: Vec<Value> = Vec::new();

    if let Some(s) = start_date {
        parts.push("date >= ?".to_string());
        params.push(Value::Text(s.to_string()));
    }
    if let Some(e) = end_date {
        parts.push("date <= ?".to_string());
        params.push(Value::Text(e.to_string()));
    }
    if let Some(c) = category {
        parts.push("category = ?".to_string());
        params.push(Value::Text(c.to_string()));
    }
    if let Some(q) = search {
        let q = q.trim();
        if !q.is_empty() {
            parts.push(
                "(LOWER(description) LIKE '%' || LOWER(?) || '%' OR LOWER(category) LIKE '%' || LOWER(?) || '%')"
                    .to_string(),
            );
            params.push(Value::Text(q.to_string()));
            params.push(Value::Text(q.to_string()));
        }
    }

    if parts.is_empty() {
        ("".to_string(), params)
    } else {
        (format!(" WHERE {}", parts.join(" AND ")), params)
    }
}

pub fn get_transactions_filtered<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    start_date: Option<&str>,
    end_date: Option<&str>,
    category: Option<&str>,
    search: Option<&str>,
) -> Result<Vec<Transaction>, String> {
    let conn = open_connection(app)?;
    let (where_clause, params_vec) =
        build_filters_where_clause(start_date, end_date, category, search);

    let sql = format!(
        "SELECT id, date, description, amount, category, category_source, category_reason, source_file, hash, created_at
         FROM transactions
         {where_clause}
         ORDER BY date DESC"
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params_from_iter(params_vec), |row| {
            Ok(Transaction {
                id: row.get(0)?,
                date: row.get(1)?,
                description: row.get(2)?,
                amount: row.get(3)?,
                category: row.get(4)?,
                category_source: row.get(5)?,
                category_reason: row.get(6)?,
                source_file: row.get(7)?,
                hash: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

pub fn get_available_months<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<Vec<String>, String> {
    let conn = open_connection(app)?;
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT strftime('%Y-%m', date) as month
             FROM transactions
             ORDER BY month DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

pub fn get_stats_filtered<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    start_date: Option<&str>,
    end_date: Option<&str>,
    category: Option<&str>,
    search: Option<&str>,
) -> Result<Stats, String> {
    let conn = open_connection(app)?;
    let (base_where, base_params) = build_filters_where_clause(start_date, end_date, category, search);

    let income_sql = if base_where.is_empty() {
        "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE amount > 0".to_string()
    } else {
        format!("SELECT COALESCE(SUM(amount), 0) FROM transactions {base_where} AND amount > 0")
    };
    let total_income: f64 = conn
        .query_row(&income_sql, params_from_iter(base_params.clone()), |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let spending_sql = if base_where.is_empty() {
        "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE amount < 0".to_string()
    } else {
        format!("SELECT COALESCE(SUM(amount), 0) FROM transactions {base_where} AND amount < 0")
    };
    let total_spending_negative: f64 = conn
        .query_row(&spending_sql, params_from_iter(base_params.clone()), |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let count_sql = if base_where.is_empty() {
        "SELECT COUNT(*) FROM transactions".to_string()
    } else {
        format!("SELECT COUNT(*) FROM transactions {base_where}")
    };
    let transaction_count: u32 = conn
        .query_row(&count_sql, params_from_iter(base_params.clone()), |row| {
            let v: i64 = row.get(0)?;
            Ok(v as u32)
        })
        .map_err(|e| e.to_string())?;

    let mut by_category = std::collections::HashMap::new();
    for cat in VALID_CATEGORIES {
        by_category.insert(cat.to_string(), 0.0);
    }

    let by_cat_sql = if base_where.is_empty() {
        "SELECT category, COALESCE(SUM(ABS(amount)), 0) as total
         FROM transactions
         WHERE amount < 0 AND category NOT IN ('income', 'transfer')
         GROUP BY category"
            .to_string()
    } else {
        format!(
            "SELECT category, COALESCE(SUM(ABS(amount)), 0) as total
             FROM transactions
             {base_where}
             AND amount < 0 AND category NOT IN ('income', 'transfer')
             GROUP BY category"
        )
    };

    let mut stmt = conn.prepare(&by_cat_sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params_from_iter(base_params.clone()), |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
        })
        .map_err(|e| e.to_string())?;
    for r in rows {
        let (cat, total) = r.map_err(|e| e.to_string())?;
        by_category.insert(cat, total);
    }

    Ok(Stats {
        total_spending: -total_spending_negative,
        total_income,
        by_category,
        transaction_count,
    })
}

pub fn get_transaction_by_id<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    id: &str,
) -> Result<Option<Transaction>, String> {
    let conn = open_connection(app)?;
    conn.query_row(
        "SELECT id, date, description, amount, category, category_source, category_reason, source_file, hash, created_at
         FROM transactions
         WHERE id = ?1",
        params![id],
        |row| {
            Ok(Transaction {
                id: row.get(0)?,
                date: row.get(1)?,
                description: row.get(2)?,
                amount: row.get(3)?,
                category: row.get(4)?,
                category_source: row.get(5)?,
                category_reason: row.get(6)?,
                source_file: row.get(7)?,
                hash: row.get(8)?,
                created_at: row.get(9)?,
            })
        },
    )
    .optional()
    .map_err(|e| e.to_string())
}

pub fn upsert_custom_rule<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    pattern: &str,
    category: &str,
) -> Result<(), String> {
    if !VALID_CATEGORIES.contains(&category) {
        return Err("invalid category".to_string());
    }
    let conn = open_connection(app)?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO custom_rules (id, pattern, category, hit_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, 1, datetime('now'), datetime('now'))
         ON CONFLICT(pattern) DO UPDATE SET
           category = excluded.category,
           hit_count = hit_count + 1,
           updated_at = datetime('now')",
        params![id, pattern, category],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_custom_rule<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    pattern: &str,
) -> Result<Option<String>, String> {
    let conn = open_connection(app)?;
    conn.query_row(
        "SELECT category FROM custom_rules WHERE pattern = ?1",
        params![pattern],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| e.to_string())
}

pub fn get_all_custom_rules<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<Vec<CustomRule>, String> {
    let conn = open_connection(app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, pattern, category, hit_count, created_at
             FROM custom_rules
             ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(CustomRule {
                id: row.get(0)?,
                pattern: row.get(1)?,
                category: row.get(2)?,
                hit_count: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

pub fn delete_custom_rule<R: tauri::Runtime>(app: &tauri::AppHandle<R>, id: &str) -> Result<(), String> {
    let conn = open_connection(app)?;
    conn.execute("DELETE FROM custom_rules WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn set_budget<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    category: &str,
    monthly_limit: f64,
) -> Result<(), String> {
    if !VALID_CATEGORIES.contains(&category) {
        return Err("invalid category".to_string());
    }
    let conn = open_connection(app)?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO budgets (id, category, monthly_limit, created_at, updated_at)
         VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))
         ON CONFLICT(category) DO UPDATE SET
           monthly_limit = excluded.monthly_limit,
           updated_at = datetime('now')",
        params![id, category, monthly_limit],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_budgets<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<Vec<Budget>, String> {
    let conn = open_connection(app)?;
    let mut stmt = conn
        .prepare("SELECT id, category, monthly_limit FROM budgets ORDER BY category ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Budget {
                id: row.get(0)?,
                category: row.get(1)?,
                monthly_limit: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

pub fn delete_budget<R: tauri::Runtime>(app: &tauri::AppHandle<R>, category: &str) -> Result<(), String> {
    let conn = open_connection(app)?;
    conn.execute("DELETE FROM budgets WHERE category = ?1", params![category])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_budget_status<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    month: &str,
) -> Result<Vec<BudgetStatus>, String> {
    let conn = open_connection(app)?;
    let mut stmt = conn
        .prepare(
            "SELECT
                b.category,
                b.monthly_limit,
                COALESCE(SUM(ABS(t.amount)), 0) as spent
             FROM budgets b
             LEFT JOIN transactions t ON t.category = b.category
                AND strftime('%Y-%m', t.date) = ?1
                AND t.amount < 0
             GROUP BY b.category, b.monthly_limit
             ORDER BY b.category ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![month], |row| {
            let category: String = row.get(0)?;
            let monthly_limit: f64 = row.get(1)?;
            let spent: f64 = row.get(2)?;
            let remaining = monthly_limit - spent;
            let percent_used = if monthly_limit <= 0.0 {
                0.0
            } else {
                (spent / monthly_limit) * 100.0
            };
            Ok(BudgetStatus {
                category,
                monthly_limit,
                spent,
                remaining,
                percent_used,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}
