use crate::VALID_CATEGORIES;
use tauri_plugin_shell::ShellExt;

pub async fn categorize_with_llm<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    model_path: &str,
    description: &str,
    amount: f64,
) -> Result<String, String> {
    let prompt = format!(
        "[INST] Categorize this bank transaction. Reply with ONLY one word from: housing, utilities, groceries, dining, transport, shopping, entertainment, health, subscriptions, transfer, income, other\n\n{} ${:.2} [/INST]",
        description,
        amount.abs()
    );

    let output = app
        .shell()
        .sidecar("llama-cli")
        .map_err(|e| e.to_string())?
        .args([
            "--log-disable",
            "--simple-io",
            "-m",
            model_path,
            "-p",
            &prompt,
            "-n",
            "10",
            "--temp",
            "0",
            "--no-display-prompt",
            "--single-turn",
            "-c",
            "512",
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let response = String::from_utf8_lossy(&output.stdout);
    parse_category(&response)
}

fn parse_category(response: &str) -> Result<String, String> {
    let cleaned = response.trim().to_lowercase();
    for cat in VALID_CATEGORIES {
        if cleaned.contains(cat) {
            return Ok(cat.to_string());
        }
    }
    Ok("other".to_string())
}
