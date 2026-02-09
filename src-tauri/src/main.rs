#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod categorizer;
mod commands;
mod csv_parser;
mod db;
mod llm;
#[cfg(test)]
mod tests;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub date: String, // YYYY-MM-DD
    pub description: String,
    pub amount: f64, // negative = expense
    pub category: String,
    pub category_source: String, // rule | learned_rule | llm | manual | unknown
    pub category_reason: String, // human-readable explanation
    pub source_file: String,
    pub hash: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported: u32,
    pub duplicates_skipped: u32,
    pub rules_used: u32,
    pub llm_used: u32,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stats {
    pub total_spending: f64,
    pub total_income: f64,
    pub by_category: std::collections::HashMap<String, f64>,
    pub transaction_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomRule {
    pub id: String,
    pub pattern: String,
    pub category: String,
    pub hit_count: i32,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Budget {
    pub id: String,
    pub category: String,
    pub monthly_limit: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetStatus {
    pub category: String,
    pub monthly_limit: f64,
    pub spent: f64,
    pub remaining: f64,
    pub percent_used: f64,
}

pub const VALID_CATEGORIES: [&str; 12] = [
    "housing",
    "utilities",
    "groceries",
    "dining",
    "transport",
    "shopping",
    "entertainment",
    "health",
    "subscriptions",
    "transfer",
    "income",
    "other",
];

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            db::init_db(app.handle()).map_err(|e| e.to_string())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::check_model_setup,
            commands::set_model_path,
            commands::get_language,
            commands::set_language,
            commands::get_auto_learn_rules,
            commands::set_auto_learn_rules,
            commands::reset_data,
            commands::import_csv,
            commands::get_transactions,
            commands::get_transactions_filtered,
            commands::get_available_months,
            commands::update_category,
            commands::get_stats,
            commands::get_stats_filtered,
            commands::set_budget,
            commands::get_budgets,
            commands::delete_budget,
            commands::get_budget_status,
            commands::export_csv,
            commands::get_custom_rules,
            commands::delete_custom_rule
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
