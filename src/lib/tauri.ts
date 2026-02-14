import { invoke } from "@tauri-apps/api/core";
import type { Budget, BudgetStatus, Category, CustomRule, ImportResult, Stats, Transaction } from "@/types";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/* ── Mock data for browser preview ── */

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "m1", date: "2026-02-09", description: "Whole Foods Market", amount: -87.32, category: "groceries", category_source: "rule", category_reason: "pattern: whole foods", source_file: "demo.csv", hash: "a1", created_at: "2026-02-09T10:00:00Z" },
  { id: "m2", date: "2026-02-08", description: "Rent payment Feb", amount: -2100.0, category: "housing", category_source: "rule", category_reason: "pattern: rent", source_file: "demo.csv", hash: "a2", created_at: "2026-02-08T10:00:00Z" },
  { id: "m3", date: "2026-02-07", description: "Uber trip downtown", amount: -18.5, category: "transport", category_source: "llm", category_reason: "ride-hailing service", source_file: "demo.csv", hash: "a3", created_at: "2026-02-07T10:00:00Z" },
  { id: "m4", date: "2026-02-06", description: "Netflix subscription", amount: -15.99, category: "subscriptions", category_source: "rule", category_reason: "pattern: netflix", source_file: "demo.csv", hash: "a4", created_at: "2026-02-06T10:00:00Z" },
  { id: "m5", date: "2026-02-05", description: "Salary deposit", amount: 5200.0, category: "income", category_source: "rule", category_reason: "pattern: salary", source_file: "demo.csv", hash: "a5", created_at: "2026-02-05T10:00:00Z" },
  { id: "m6", date: "2026-02-04", description: "Electric bill", amount: -124.0, category: "utilities", category_source: "rule", category_reason: "pattern: electric", source_file: "demo.csv", hash: "a6", created_at: "2026-02-04T10:00:00Z" },
  { id: "m7", date: "2026-02-03", description: "Sushi restaurant", amount: -42.8, category: "dining", category_source: "llm", category_reason: "restaurant expense", source_file: "demo.csv", hash: "a7", created_at: "2026-02-03T10:00:00Z" },
  { id: "m8", date: "2026-02-02", description: "Amazon purchase", amount: -65.99, category: "shopping", category_source: "llm", category_reason: "online retail", source_file: "demo.csv", hash: "a8", created_at: "2026-02-02T10:00:00Z" },
  { id: "m9", date: "2026-02-01", description: "Gym membership", amount: -49.0, category: "health", category_source: "rule", category_reason: "pattern: gym", source_file: "demo.csv", hash: "a9", created_at: "2026-02-01T10:00:00Z" },
  { id: "m10", date: "2026-01-31", description: "Movie tickets", amount: -28.0, category: "entertainment", category_source: "llm", category_reason: "cinema", source_file: "demo.csv", hash: "a10", created_at: "2026-01-31T10:00:00Z" },
  { id: "m11", date: "2026-01-30", description: "Transfer to savings", amount: -500.0, category: "transfer", category_source: "rule", category_reason: "pattern: transfer", source_file: "demo.csv", hash: "a11", created_at: "2026-01-30T10:00:00Z" },
  { id: "m12", date: "2026-01-28", description: "Trader Joe's", amount: -54.21, category: "groceries", category_source: "rule", category_reason: "pattern: trader joe", source_file: "demo.csv", hash: "a12", created_at: "2026-01-28T10:00:00Z" },
  { id: "m13", date: "2026-01-25", description: "Freelance payment", amount: 1200.0, category: "income", category_source: "rule", category_reason: "pattern: freelance", source_file: "demo.csv", hash: "a13", created_at: "2026-01-25T10:00:00Z" },
  { id: "m14", date: "2026-01-22", description: "Coffee shop", amount: -6.5, category: "dining", category_source: "llm", category_reason: "cafe expense", source_file: "demo.csv", hash: "a14", created_at: "2026-01-22T10:00:00Z" },
  { id: "m15", date: "2026-01-20", description: "Internet bill", amount: -79.99, category: "utilities", category_source: "rule", category_reason: "pattern: internet", source_file: "demo.csv", hash: "a15", created_at: "2026-01-20T10:00:00Z" },
];

function buildMockStats(txns: Transaction[]): Stats {
  const by_category: Record<Category, number> = {
    housing: 0, utilities: 0, groceries: 0, dining: 0, transport: 0,
    shopping: 0, entertainment: 0, health: 0, subscriptions: 0,
    transfer: 0, income: 0, other: 0,
  };
  let total_spending = 0;
  let total_income = 0;
  for (const t of txns) {
    if (t.amount < 0) {
      by_category[t.category] += Math.abs(t.amount);
      total_spending += Math.abs(t.amount);
    } else {
      by_category[t.category] += t.amount;
      total_income += t.amount;
    }
  }
  return { total_spending, total_income, by_category, transaction_count: txns.length };
}

const MOCK_BUDGETS: Budget[] = [
  { id: "b1", category: "groceries", monthly_limit: 400 },
  { id: "b2", category: "dining", monthly_limit: 150 },
  { id: "b3", category: "entertainment", monthly_limit: 100 },
];

const MOCK_BUDGET_STATUS: BudgetStatus[] = [
  { category: "groceries", monthly_limit: 400, spent: 141.53, remaining: 258.47, percent_used: 35.4 },
  { category: "dining", monthly_limit: 150, spent: 49.3, remaining: 100.7, percent_used: 32.9 },
  { category: "entertainment", monthly_limit: 100, spent: 28.0, remaining: 72.0, percent_used: 28.0 },
];

const MOCK_RULES: CustomRule[] = [
  { id: "r1", pattern: "whole foods", category: "groceries", hit_count: 12, created_at: "2026-01-10T10:00:00Z" },
  { id: "r2", pattern: "netflix", category: "subscriptions", hit_count: 3, created_at: "2026-01-15T10:00:00Z" },
  { id: "r3", pattern: "uber", category: "transport", hit_count: 8, created_at: "2026-01-20T10:00:00Z" },
];

/* ── API functions ── */

export async function checkModelSetup(): Promise<boolean> {
  if (!isTauri()) return true;
  return invoke<boolean>("check_model_setup");
}

export async function setModelPath(path: string): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("set_model_path", { path });
}

export async function getLanguage(): Promise<string> {
  if (!isTauri()) return "en";
  return invoke<string>("get_language");
}

export async function setLanguage(language: string): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("set_language", { language });
}

export async function getAutoLearnRules(): Promise<boolean> {
  if (!isTauri()) return true;
  return invoke<boolean>("get_auto_learn_rules");
}

export async function setAutoLearnRules(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("set_auto_learn_rules", { enabled });
}

export async function resetData(keepModelPath = true): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("reset_data", { keepModelPath });
}

export async function importCsv(path: string): Promise<ImportResult> {
  if (!isTauri()) return { imported: 5, duplicates_skipped: 1, rules_used: 3, llm_used: 2, errors: [] };
  return invoke<ImportResult>("import_csv", { path });
}

export async function getTransactions(): Promise<Transaction[]> {
  if (!isTauri()) return MOCK_TRANSACTIONS;
  return invoke<Transaction[]>("get_transactions");
}

export async function getTransactionsFiltered(
  startDate?: string,
  endDate?: string,
  category?: string,
  search?: string
): Promise<Transaction[]> {
  if (!isTauri()) {
    let result = MOCK_TRANSACTIONS;
    if (startDate) result = result.filter((t) => t.date >= startDate);
    if (endDate) result = result.filter((t) => t.date <= endDate);
    if (category) result = result.filter((t) => t.category === category);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.description.toLowerCase().includes(q));
    }
    return result;
  }
  return invoke<Transaction[]>("get_transactions_filtered", {
    startDate,
    endDate,
    category,
    search
  });
}

export async function getAvailableMonths(): Promise<string[]> {
  if (!isTauri()) return ["2026-02", "2026-01"];
  return invoke<string[]>("get_available_months");
}

export async function updateCategory(id: string, category: string): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("update_category", { id, category });
}

export async function getStats(): Promise<Stats> {
  if (!isTauri()) return buildMockStats(MOCK_TRANSACTIONS);
  return invoke<Stats>("get_stats");
}

export async function getStatsFiltered(
  startDate?: string,
  endDate?: string,
  category?: string,
  search?: string
): Promise<Stats> {
  if (!isTauri()) {
    const filtered = await getTransactionsFiltered(startDate, endDate, category, search);
    return buildMockStats(filtered);
  }
  return invoke<Stats>("get_stats_filtered", {
    startDate,
    endDate,
    category,
    search
  });
}

export async function setBudget(category: string, monthlyLimit: number): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("set_budget", { category, monthlyLimit });
}

export async function getBudgets(): Promise<Budget[]> {
  if (!isTauri()) return MOCK_BUDGETS;
  return invoke<Budget[]>("get_budgets");
}

export async function deleteBudget(category: string): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("delete_budget", { category });
}

export async function getBudgetStatus(month: string): Promise<BudgetStatus[]> {
  if (!isTauri()) return MOCK_BUDGET_STATUS;
  return invoke<BudgetStatus[]>("get_budget_status", { month });
}

export async function exportCsv(path: string, startDate?: string, endDate?: string): Promise<number> {
  if (!isTauri()) return MOCK_TRANSACTIONS.length;
  return invoke<number>("export_csv", { path, startDate, endDate });
}

export async function getCustomRules(): Promise<CustomRule[]> {
  if (!isTauri()) return MOCK_RULES;
  return invoke<CustomRule[]>("get_custom_rules");
}

export async function deleteCustomRule(id: string): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("delete_custom_rule", { id });
}

export async function isWizardCompleted(): Promise<boolean> {
  if (!isTauri()) return false;
  return invoke<boolean>("is_wizard_completed");
}

export async function setWizardCompleted(): Promise<void> {
  if (!isTauri()) return;
  return invoke<void>("set_wizard_completed");
}
