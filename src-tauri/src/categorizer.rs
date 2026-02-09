#[derive(Debug, Clone)]
pub struct CategoryDecision {
    pub category: String,
    pub source: String,
    pub reason: String,
}

pub fn categorize_by_rules<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    description: &str,
    amount: f64,
) -> Option<CategoryDecision> {
    let pattern = description.trim().to_uppercase();

    if let Ok(Some(cat)) = crate::db::get_custom_rule(app, &pattern) {
        if crate::VALID_CATEGORIES.contains(&cat.as_str()) {
            return Some(CategoryDecision {
                category: cat,
                source: "learned_rule".to_string(),
                reason: format!("LEARNED:{pattern}"),
            });
        }
    }

    let d = pattern;

    if amount > 0.0
        && (d.contains("PAYROLL") || d.contains("DIRECT DEP") || d.contains("SALARY")) {
            return Some(CategoryDecision {
                category: "income".to_string(),
                source: "rule".to_string(),
                reason: "RULE:INCOME".to_string(),
            });
        }

    if d.contains("VENMO") || d.contains("ZELLE") || d.contains("TRANSFER") || d.contains("PAYMENT TO") {
        return Some(CategoryDecision {
            category: "transfer".to_string(),
            source: "rule".to_string(),
            reason: "RULE:TRANSFER".to_string(),
        });
    }

    if d.contains("WHOLE FOODS")
        || d.contains("TRADER JOE")
        || d.contains("SAFEWAY")
        || d.contains("KROGER")
        || d.contains("WALMART")
        || d.contains("TARGET")
        || d.contains("COSTCO")
    {
        return Some(CategoryDecision {
            category: "groceries".to_string(),
            source: "rule".to_string(),
            reason: "RULE:GROCERIES".to_string(),
        });
    }

    if d.contains("UBER EATS")
        || d.contains("DOORDASH")
        || d.contains("GRUBHUB")
        || d.contains("MCDONALD")
        || d.contains("STARBUCKS")
        || d.contains("CHIPOTLE")
    {
        return Some(CategoryDecision {
            category: "dining".to_string(),
            source: "rule".to_string(),
            reason: "RULE:DINING".to_string(),
        });
    }

    if d.contains("UBER ")
        || d.contains("LYFT")
        || d.contains("SHELL")
        || d.contains("CHEVRON")
        || d.contains("EXXON")
        || d.contains(" BP")
        || d.contains("PARKING")
    {
        return Some(CategoryDecision {
            category: "transport".to_string(),
            source: "rule".to_string(),
            reason: "RULE:TRANSPORT".to_string(),
        });
    }

    if d.contains("NETFLIX")
        || d.contains("SPOTIFY")
        || d.contains("APPLE.COM/BILL")
        || d.contains("AMAZON PRIME")
        || d.contains("HULU")
        || d.contains("DISCORD")
        || d.contains("OPENAI")
        || d.contains("GITHUB")
    {
        return Some(CategoryDecision {
            category: "subscriptions".to_string(),
            source: "rule".to_string(),
            reason: "RULE:SUBSCRIPTIONS".to_string(),
        });
    }

    if d.contains("AMAZON") || d.contains("AMZN") {
        return Some(CategoryDecision {
            category: "shopping".to_string(),
            source: "rule".to_string(),
            reason: "RULE:SHOPPING".to_string(),
        });
    }

    if d.contains("CVS")
        || d.contains("WALGREENS")
        || d.contains("PHARMACY")
        || d.contains("MEDICAL")
        || d.contains("DOCTOR")
        || d.contains("HOSPITAL")
    {
        return Some(CategoryDecision {
            category: "health".to_string(),
            source: "rule".to_string(),
            reason: "RULE:HEALTH".to_string(),
        });
    }

    if d.contains("RENT") || d.contains("MORTGAGE") || d.contains("HOA") || d.contains("PROPERTY") {
        return Some(CategoryDecision {
            category: "housing".to_string(),
            source: "rule".to_string(),
            reason: "RULE:HOUSING".to_string(),
        });
    }

    if d.contains("ELECTRIC")
        || d.contains("GAS COMPANY")
        || d.contains("WATER")
        || d.contains("INTERNET")
        || d.contains("COMCAST")
        || d.contains("VERIZON")
        || d.contains("AT&T")
        || d.contains("T-MOBILE")
    {
        return Some(CategoryDecision {
            category: "utilities".to_string(),
            source: "rule".to_string(),
            reason: "RULE:UTILITIES".to_string(),
        });
    }

    None
}
