import { invoke } from "@tauri-apps/api/core";
import type { Budget, BudgetStatus, CustomRule, ImportResult, Stats, Transaction } from "@/types";

export async function checkModelSetup(): Promise<boolean> {
  return invoke<boolean>("check_model_setup");
}

export async function setModelPath(path: string): Promise<void> {
  return invoke<void>("set_model_path", { path });
}

export async function getLanguage(): Promise<string> {
  return invoke<string>("get_language");
}

export async function setLanguage(language: string): Promise<void> {
  return invoke<void>("set_language", { language });
}

export async function getAutoLearnRules(): Promise<boolean> {
  return invoke<boolean>("get_auto_learn_rules");
}

export async function setAutoLearnRules(enabled: boolean): Promise<void> {
  return invoke<void>("set_auto_learn_rules", { enabled });
}

export async function resetData(keepModelPath = true): Promise<void> {
  return invoke<void>("reset_data", { keepModelPath });
}

export async function importCsv(path: string): Promise<ImportResult> {
  return invoke<ImportResult>("import_csv", { path });
}

export async function getTransactions(): Promise<Transaction[]> {
  return invoke<Transaction[]>("get_transactions");
}

export async function getTransactionsFiltered(
  startDate?: string,
  endDate?: string,
  category?: string,
  search?: string
): Promise<Transaction[]> {
  return invoke<Transaction[]>("get_transactions_filtered", {
    startDate,
    endDate,
    category,
    search
  });
}

export async function getAvailableMonths(): Promise<string[]> {
  return invoke<string[]>("get_available_months");
}

export async function updateCategory(id: string, category: string): Promise<void> {
  return invoke<void>("update_category", { id, category });
}

export async function getStats(): Promise<Stats> {
  return invoke<Stats>("get_stats");
}

export async function getStatsFiltered(
  startDate?: string,
  endDate?: string,
  category?: string,
  search?: string
): Promise<Stats> {
  return invoke<Stats>("get_stats_filtered", {
    startDate,
    endDate,
    category,
    search
  });
}

export async function setBudget(category: string, monthlyLimit: number): Promise<void> {
  return invoke<void>("set_budget", { category, monthlyLimit });
}

export async function getBudgets(): Promise<Budget[]> {
  return invoke<Budget[]>("get_budgets");
}

export async function deleteBudget(category: string): Promise<void> {
  return invoke<void>("delete_budget", { category });
}

export async function getBudgetStatus(month: string): Promise<BudgetStatus[]> {
  return invoke<BudgetStatus[]>("get_budget_status", { month });
}

export async function exportCsv(path: string, startDate?: string, endDate?: string): Promise<number> {
  return invoke<number>("export_csv", { path, startDate, endDate });
}

export async function getCustomRules(): Promise<CustomRule[]> {
  return invoke<CustomRule[]>("get_custom_rules");
}

export async function deleteCustomRule(id: string): Promise<void> {
  return invoke<void>("delete_custom_rule", { id });
}
