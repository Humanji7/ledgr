import { invoke } from "@tauri-apps/api/core";
import type { Budget, BudgetStatus, Category, CustomRule, ImportResult, Stats, Transaction } from "@/types";
import { VALID_CATEGORIES } from "@/types";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

type DemoSettings = {
  language: string;
  autoLearnRules: boolean;
  wizardCompleted: boolean;
  modelPath: string | null;
};

type DemoState = {
  transactions: Transaction[];
  budgets: Budget[];
  rules: CustomRule[];
  settings: DemoSettings;
};

const DEMO_STORAGE_KEY = "ledgr:web-demo:v2";

/* ── Seed data for browser preview ── */

const SEED_TRANSACTIONS: Transaction[] = [
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

const SEED_BUDGETS: Budget[] = [
  { id: "b1", category: "groceries", monthly_limit: 400 },
  { id: "b2", category: "dining", monthly_limit: 150 },
  { id: "b3", category: "entertainment", monthly_limit: 100 },
];

const SEED_RULES: CustomRule[] = [
  { id: "r1", pattern: "whole foods", category: "groceries", hit_count: 12, created_at: "2026-01-10T10:00:00Z" },
  { id: "r2", pattern: "netflix", category: "subscriptions", hit_count: 3, created_at: "2026-01-15T10:00:00Z" },
  { id: "r3", pattern: "uber", category: "transport", hit_count: 8, created_at: "2026-01-20T10:00:00Z" },
];

let demoStateCache: DemoState | null = null;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeDefaultDemoState(): DemoState {
  return {
    transactions: clone(SEED_TRANSACTIONS),
    budgets: clone(SEED_BUDGETS),
    rules: clone(SEED_RULES),
    settings: {
      language: "en",
      autoLearnRules: true,
      wizardCompleted: true,
      modelPath: "web-demo/mock-model.gguf"
    }
  };
}

function loadDemoState(): DemoState {
  if (demoStateCache) return demoStateCache;
  const fallback = makeDefaultDemoState();
  if (typeof window === "undefined") {
    demoStateCache = fallback;
    return demoStateCache;
  }
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) {
      demoStateCache = fallback;
      return demoStateCache;
    }
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    demoStateCache = {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : fallback.transactions,
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : fallback.budgets,
      rules: Array.isArray(parsed.rules) ? parsed.rules : fallback.rules,
      settings: {
        ...fallback.settings,
        ...(parsed.settings ?? {})
      }
    };
    return demoStateCache;
  } catch {
    demoStateCache = fallback;
    return demoStateCache;
  }
}

function saveDemoState(): void {
  if (!demoStateCache || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoStateCache));
  } catch {
    // ignore storage quota / privacy mode errors in demo mode
  }
}

function withDemoState<T>(fn: (state: DemoState) => T): T {
  const state = loadDemoState();
  const result = fn(state);
  saveDemoState();
  return result;
}

function emptyCategoryTotals(): Record<Category, number> {
  return {
    housing: 0,
    utilities: 0,
    groceries: 0,
    dining: 0,
    transport: 0,
    shopping: 0,
    entertainment: 0,
    health: 0,
    subscriptions: 0,
    transfer: 0,
    income: 0,
    other: 0,
  };
}

function buildStats(txns: Transaction[]): Stats {
  const by_category = emptyCategoryTotals();
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

function normalizeCategory(raw: string | null | undefined): Category | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if ((VALID_CATEGORIES as string[]).includes(value)) return value as Category;
  return null;
}

function filterTransactions(
  txns: Transaction[],
  startDate?: string,
  endDate?: string,
  category?: string,
  search?: string
): Transaction[] {
  let result = txns.slice();
  if (startDate) result = result.filter((t) => t.date >= startDate);
  if (endDate) result = result.filter((t) => t.date <= endDate);
  if (category) result = result.filter((t) => t.category === category);
  if (search) {
    const q = search.toLowerCase();
    result = result.filter((t) =>
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }
  return result.sort((a, b) => (a.date === b.date ? b.created_at.localeCompare(a.created_at) : b.date.localeCompare(a.date)));
}

function getMonthOptions(txns: Transaction[]): string[] {
  const months = new Set<string>();
  for (const t of txns) months.add(t.date.slice(0, 7));
  return [...months].sort((a, b) => b.localeCompare(a));
}

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function stableHash(parts: string[]): string {
  return parts.join("|").toLowerCase().replace(/\s+/g, " ").trim();
}

function inferCategory(description: string, amount: number): { category: Category; source: "rule" | "llm"; reason: string } {
  const d = description.toLowerCase();
  if (amount > 0) return { category: "income", source: "rule", reason: "positive amount" };
  if (d.includes("rent")) return { category: "housing", source: "rule", reason: "pattern: rent" };
  if (d.includes("uber") || d.includes("lyft") || d.includes("taxi")) return { category: "transport", source: "rule", reason: "transport keyword" };
  if (d.includes("netflix") || d.includes("spotify") || d.includes("apple icloud")) return { category: "subscriptions", source: "rule", reason: "subscription keyword" };
  if (d.includes("whole foods") || d.includes("trader joe") || d.includes("grocery") || d.includes("market")) return { category: "groceries", source: "rule", reason: "grocery keyword" };
  if (d.includes("restaurant") || d.includes("cafe") || d.includes("coffee") || d.includes("doordash") || d.includes("sushi")) return { category: "dining", source: "llm", reason: "merchant looks like dining" };
  if (d.includes("amazon") || d.includes("target") || d.includes("walmart")) return { category: "shopping", source: "llm", reason: "retail merchant" };
  if (d.includes("electric") || d.includes("internet") || d.includes("water") || d.includes("utility")) return { category: "utilities", source: "rule", reason: "utility keyword" };
  if (d.includes("gym") || d.includes("pharmacy") || d.includes("clinic")) return { category: "health", source: "llm", reason: "health-related merchant" };
  if (d.includes("movie") || d.includes("cinema") || d.includes("steam")) return { category: "entertainment", source: "llm", reason: "entertainment merchant" };
  if (d.includes("transfer") || d.includes("zelle") || d.includes("venmo")) return { category: "transfer", source: "rule", reason: "transfer keyword" };
  return { category: "other", source: "llm", reason: "fallback categorization" };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (ch === '\r') continue;
    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function normalizeDate(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$\s]/g, "").replace(/\((.*)\)/, "-$1").replace(/,/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function headerIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx >= 0) return idx;
  }
  return -1;
}

function transactionsFromCsv(text: string, fileName: string): { transactions: Transaction[]; errors: string[] } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { transactions: [], errors: ["CSV is empty or missing rows"] };

  const headers = rows[0];
  const dateIdx = headerIndex(headers, ["date", "posted date", "transaction date"]);
  const descIdx = headerIndex(headers, ["description", "details", "name", "merchant", "payee"]);
  const amountIdx = headerIndex(headers, ["amount", "sum"]);
  const debitIdx = headerIndex(headers, ["debit", "withdrawal", "outflow"]);
  const creditIdx = headerIndex(headers, ["credit", "deposit", "inflow"]);
  const categoryIdx = headerIndex(headers, ["category"]);

  if (dateIdx < 0 || descIdx < 0 || (amountIdx < 0 && debitIdx < 0 && creditIdx < 0)) {
    return { transactions: [], errors: ["Could not detect required CSV columns (date/description/amount)"] };
  }

  const out: Transaction[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const r = rows[i];
    const date = normalizeDate(r[dateIdx] ?? "");
    const description = (r[descIdx] ?? "").trim();

    let amount: number | null = null;
    if (amountIdx >= 0) {
      amount = parseAmount(r[amountIdx] ?? "");
    } else {
      const debit = debitIdx >= 0 ? parseAmount(r[debitIdx] ?? "") : null;
      const credit = creditIdx >= 0 ? parseAmount(r[creditIdx] ?? "") : null;
      if (debit !== null || credit !== null) amount = (credit ?? 0) - Math.abs(debit ?? 0);
    }

    if (!date || !description || amount === null) {
      errors.push(`Row ${i + 1}: skipped (invalid date/description/amount)`);
      continue;
    }

    const explicitCategory = normalizeCategory(categoryIdx >= 0 ? r[categoryIdx] : undefined);
    const inferred = explicitCategory
      ? { category: explicitCategory, source: "rule" as const, reason: "csv category" }
      : inferCategory(description, amount);

    const createdAt = new Date().toISOString();
    const hash = stableHash([date, description, amount.toFixed(2)]);
    out.push({
      id: makeId("txn"),
      date,
      description,
      amount,
      category: inferred.category,
      category_source: inferred.source,
      category_reason: inferred.reason,
      source_file: fileName,
      hash,
      created_at: createdAt
    });
  }

  return { transactions: out, errors };
}

function importIntoDemoState(newTransactions: Transaction[]): ImportResult {
  return withDemoState((state) => {
    const existing = new Set(state.transactions.map((t) => t.hash));
    let imported = 0;
    let duplicates_skipped = 0;
    let rules_used = 0;
    let llm_used = 0;

    for (const t of newTransactions) {
      if (existing.has(t.hash)) {
        duplicates_skipped += 1;
        continue;
      }
      existing.add(t.hash);
      state.transactions.push(t);
      imported += 1;
      if (t.category_source === "rule") rules_used += 1;
      if (t.category_source === "llm") llm_used += 1;

      const token = t.description.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).find((x) => x.length >= 4);
      if (token && state.settings.autoLearnRules && t.amount < 0) {
        const existingRule = state.rules.find((r) => r.pattern === token);
        if (existingRule) {
          existingRule.hit_count += 1;
        } else {
          state.rules.unshift({
            id: makeId("rule"),
            pattern: token,
            category: t.category,
            hit_count: 1,
            created_at: new Date().toISOString()
          });
        }
      }
    }

    state.transactions.sort((a, b) => (a.date === b.date ? b.created_at.localeCompare(a.created_at) : b.date.localeCompare(a.date)));

    return { imported, duplicates_skipped, rules_used, llm_used, errors: [] };
  });
}

function getBudgetStatusForMonth(state: DemoState, month: string): BudgetStatus[] {
  const txns = state.transactions.filter((t) => t.date.startsWith(month) && t.amount < 0);
  const spentByCategory = new Map<Category, number>();
  for (const t of txns) {
    spentByCategory.set(t.category, (spentByCategory.get(t.category) ?? 0) + Math.abs(t.amount));
  }
  return state.budgets
    .map((b) => {
      const spent = spentByCategory.get(b.category) ?? 0;
      const remaining = b.monthly_limit - spent;
      const percent_used = b.monthly_limit > 0 ? (spent / b.monthly_limit) * 100 : 0;
      return {
        category: b.category,
        monthly_limit: b.monthly_limit,
        spent,
        remaining,
        percent_used: Number(percent_used.toFixed(1))
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category));
}

function csvFromTransactions(txns: Transaction[]): string {
  const header = [
    "date",
    "description",
    "amount",
    "category",
    "category_source",
    "category_reason",
    "source_file"
  ].join(",");
  const lines = txns.map((t) => [
    t.date,
    csvEscape(t.description),
    t.amount.toFixed(2),
    t.category,
    t.category_source,
    csvEscape(t.category_reason),
    csvEscape(t.source_file)
  ].join(","));
  return [header, ...lines].join("\n");
}

export async function importCsvBrowserFile(file: File): Promise<ImportResult> {
  const text = await file.text();
  const parsed = transactionsFromCsv(text, file.name || "browser-upload.csv");
  const result = importIntoDemoState(parsed.transactions);
  return {
    ...result,
    errors: [...result.errors, ...parsed.errors].slice(0, 20)
  };
}

export async function exportCsvText(
  startDate?: string,
  endDate?: string,
  category?: string,
  search?: string
): Promise<{ text: string; count: number }> {
  const txns = filterTransactions(loadDemoState().transactions, startDate, endDate, category, search);
  return { text: csvFromTransactions(txns), count: txns.length };
}

/* ── API functions ── */

export async function checkModelSetup(): Promise<boolean> {
  if (!isTauriRuntime()) return true;
  return invoke<boolean>("check_model_setup");
}

export async function setModelPath(path: string): Promise<void> {
  if (!isTauriRuntime()) {
    withDemoState((state) => {
      state.settings.modelPath = path;
    });
    return;
  }
  return invoke<void>("set_model_path", { path });
}

export async function getLanguage(): Promise<string> {
  if (!isTauriRuntime()) return loadDemoState().settings.language;
  return invoke<string>("get_language");
}

export async function setLanguage(language: string): Promise<void> {
  if (!isTauriRuntime()) {
    withDemoState((state) => {
      state.settings.language = language;
    });
    return;
  }
  return invoke<void>("set_language", { language });
}

export async function getAutoLearnRules(): Promise<boolean> {
  if (!isTauriRuntime()) return loadDemoState().settings.autoLearnRules;
  return invoke<boolean>("get_auto_learn_rules");
}

export async function setAutoLearnRules(enabled: boolean): Promise<void> {
  if (!isTauriRuntime()) {
    withDemoState((state) => {
      state.settings.autoLearnRules = enabled;
    });
    return;
  }
  return invoke<void>("set_auto_learn_rules", { enabled });
}

export async function resetData(keepModelPath = true): Promise<void> {
  if (!isTauriRuntime()) {
    withDemoState((state) => {
      const modelPath = keepModelPath ? state.settings.modelPath : null;
      const settings = { ...state.settings, modelPath };
      const next = makeDefaultDemoState();
      state.transactions = next.transactions;
      state.budgets = next.budgets;
      state.rules = next.rules;
      state.settings = { ...next.settings, ...settings };
    });
    return;
  }
  return invoke<void>("reset_data", { keepModelPath });
}

export async function importCsv(path: string): Promise<ImportResult> {
  if (!isTauriRuntime()) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const baseDate = `${yyyy}-${mm}-15`;
    const synthetic: Transaction[] = [
      {
        id: makeId("txn"),
        date: baseDate,
        description: `Imported from ${path.split(/[\\/]/).pop() || "file.csv"}`,
        amount: -32.45,
        category: "other",
        category_source: "llm",
        category_reason: "demo import",
        source_file: path,
        hash: stableHash([baseDate, path, "-32.45", String(Date.now())]),
        created_at: new Date().toISOString()
      }
    ];
    return importIntoDemoState(synthetic);
  }
  return invoke<ImportResult>("import_csv", { path });
}

export async function getTransactions(): Promise<Transaction[]> {
  if (!isTauriRuntime()) return clone(loadDemoState().transactions);
  return invoke<Transaction[]>("get_transactions");
}

export async function getTransactionsFiltered(
  startDate?: string,
  endDate?: string,
  category?: string,
  search?: string
): Promise<Transaction[]> {
  if (!isTauriRuntime()) {
    return clone(filterTransactions(loadDemoState().transactions, startDate, endDate, category, search));
  }
  return invoke<Transaction[]>("get_transactions_filtered", {
    startDate,
    endDate,
    category,
    search
  });
}

export async function getAvailableMonths(): Promise<string[]> {
  if (!isTauriRuntime()) return getMonthOptions(loadDemoState().transactions);
  return invoke<string[]>("get_available_months");
}

export async function updateCategory(id: string, category: string): Promise<void> {
  if (!isTauriRuntime()) {
    withDemoState((state) => {
      const txn = state.transactions.find((t) => t.id === id);
      const nextCategory = normalizeCategory(category) ?? "other";
      if (!txn) return;
      txn.category = nextCategory;
      txn.category_source = "manual";
      txn.category_reason = "manual edit";
      if (state.settings.autoLearnRules) {
        const token = txn.description.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).find((x) => x.length >= 4);
        if (token) {
          const rule = state.rules.find((r) => r.pattern === token);
          if (rule) {
            rule.category = nextCategory;
            rule.hit_count += 1;
          } else {
            state.rules.unshift({
              id: makeId("rule"),
              pattern: token,
              category: nextCategory,
              hit_count: 1,
              created_at: new Date().toISOString()
            });
          }
        }
      }
    });
    return;
  }
  return invoke<void>("update_category", { id, category });
}

export async function getStats(): Promise<Stats> {
  if (!isTauriRuntime()) return buildStats(loadDemoState().transactions);
  return invoke<Stats>("get_stats");
}

export async function getStatsFiltered(
  startDate?: string,
  endDate?: string,
  category?: string,
  search?: string
): Promise<Stats> {
  if (!isTauriRuntime()) {
    const filtered = filterTransactions(loadDemoState().transactions, startDate, endDate, category, search);
    return buildStats(filtered);
  }
  return invoke<Stats>("get_stats_filtered", {
    startDate,
    endDate,
    category,
    search
  });
}

export async function setBudget(category: string, monthlyLimit: number): Promise<void> {
  if (!isTauriRuntime()) {
    withDemoState((state) => {
      const cat = normalizeCategory(category) ?? "other";
      const existing = state.budgets.find((b) => b.category === cat);
      if (existing) {
        existing.monthly_limit = monthlyLimit;
      } else {
        state.budgets.push({ id: makeId("budget"), category: cat, monthly_limit: monthlyLimit });
      }
    });
    return;
  }
  return invoke<void>("set_budget", { category, monthlyLimit });
}

export async function getBudgets(): Promise<Budget[]> {
  if (!isTauriRuntime()) return clone(loadDemoState().budgets).sort((a, b) => a.category.localeCompare(b.category));
  return invoke<Budget[]>("get_budgets");
}

export async function deleteBudget(category: string): Promise<void> {
  if (!isTauriRuntime()) {
    withDemoState((state) => {
      state.budgets = state.budgets.filter((b) => b.category !== category);
    });
    return;
  }
  return invoke<void>("delete_budget", { category });
}

export async function getBudgetStatus(month: string): Promise<BudgetStatus[]> {
  if (!isTauriRuntime()) return clone(getBudgetStatusForMonth(loadDemoState(), month));
  return invoke<BudgetStatus[]>("get_budget_status", { month });
}

export async function exportCsv(path: string, startDate?: string, endDate?: string): Promise<number> {
  if (!isTauriRuntime()) {
    const txns = filterTransactions(loadDemoState().transactions, startDate, endDate);
    return txns.length;
  }
  return invoke<number>("export_csv", { path, startDate, endDate });
}

export async function getCustomRules(): Promise<CustomRule[]> {
  if (!isTauriRuntime()) return clone(loadDemoState().rules);
  return invoke<CustomRule[]>("get_custom_rules");
}

export async function deleteCustomRule(id: string): Promise<void> {
  if (!isTauriRuntime()) {
    withDemoState((state) => {
      state.rules = state.rules.filter((r) => r.id !== id);
    });
    return;
  }
  return invoke<void>("delete_custom_rule", { id });
}

export async function isWizardCompleted(): Promise<boolean> {
  if (!isTauriRuntime()) return loadDemoState().settings.wizardCompleted;
  return invoke<boolean>("is_wizard_completed");
}

export async function setWizardCompleted(): Promise<void> {
  if (!isTauriRuntime()) {
    withDemoState((state) => {
      state.settings.wizardCompleted = true;
    });
    return;
  }
  return invoke<void>("set_wizard_completed");
}
