use sha2::{Digest, Sha256};

#[derive(Debug, Clone)]
pub struct ParsedTransaction {
    pub date: String, // YYYY-MM-DD
    pub description: String,
    pub amount: f64,
    pub hash: String,
}

fn to_iso_date(mmddyyyy: &str) -> Result<String, String> {
    let parts: Vec<&str> = mmddyyyy.trim().split('/').collect();
    if parts.len() != 3 {
        return Err(format!("invalid date: {mmddyyyy}"));
    }
    let month: u32 = parts[0].parse().map_err(|_| format!("invalid date: {mmddyyyy}"))?;
    let day: u32 = parts[1].parse().map_err(|_| format!("invalid date: {mmddyyyy}"))?;
    let year: u32 = parts[2].parse().map_err(|_| format!("invalid date: {mmddyyyy}"))?;
    Ok(format!("{year:04}-{month:02}-{day:02}"))
}

fn parse_amount(raw: &str) -> Result<f64, String> {
    let cleaned = raw
        .trim()
        .trim_start_matches('$')
        .replace(',', "")
        .replace('(', "-")
        .replace(')', "");
    cleaned
        .parse::<f64>()
        .map_err(|_| format!("invalid amount: {raw}"))
}

fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    let out = hasher.finalize();
    hex::encode(out)
}

pub fn parse_chase_csv(path: &str) -> Result<Vec<ParsedTransaction>, String> {
    let mut rdr = csv::ReaderBuilder::new()
        .flexible(true)
        .from_path(path)
        .map_err(|e| e.to_string())?;

    let headers = rdr.headers().map_err(|e| e.to_string())?.clone();
    let col_count = headers.len();

    let (date_idx, desc_idx, amount_idx) = match col_count {
        7 => (0usize, 2usize, 5usize),
        3 => (0usize, 1usize, 2usize),
        _ => {
            return Err(format!(
                "unsupported CSV format (expected 3 or 7 columns, got {col_count})"
            ))
        }
    };

    let mut out = Vec::new();
    for record in rdr.records() {
        let rec = record.map_err(|e| e.to_string())?;
        let date_raw = rec.get(date_idx).unwrap_or("").trim();
        let desc = rec.get(desc_idx).unwrap_or("").trim().to_string();
        let amount_raw = rec.get(amount_idx).unwrap_or("").trim();

        if date_raw.is_empty() || desc.is_empty() || amount_raw.is_empty() {
            continue;
        }

        let date = to_iso_date(date_raw)?;
        let amount = parse_amount(amount_raw)?;
        if amount == 0.0 {
            continue;
        }

        let hash_input = format!("{date}{desc}{}", amount.to_string());
        let hash = sha256_hex(&hash_input);

        out.push(ParsedTransaction {
            date,
            description: desc,
            amount,
            hash,
        });
    }

    Ok(out)
}

