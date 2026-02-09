export type Category =
  | "housing"
  | "utilities"
  | "groceries"
  | "dining"
  | "transport"
  | "shopping"
  | "entertainment"
  | "health"
  | "subscriptions"
  | "transfer"
  | "income"
  | "other";

export const VALID_CATEGORIES: Category[] = [
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
  "other"
];

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // negative = expense
  category: Category;
  category_source: string;
  category_reason: string;
  source_file: string;
  hash: string;
  created_at: string;
}

export interface ImportResult {
  imported: number;
  duplicates_skipped: number;
  rules_used: number;
  llm_used: number;
  errors: string[];
}

export interface Stats {
  total_spending: number;
  total_income: number;
  by_category: Record<Category, number>;
  transaction_count: number;
}

export interface CustomRule {
  id: string;
  pattern: string;
  category: Category;
  hit_count: number;
  created_at: string;
}

export interface Budget {
  id: string;
  category: Category;
  monthly_limit: number;
}

export interface BudgetStatus {
  category: Category;
  monthly_limit: number;
  spent: number;
  remaining: number;
  percent_used: number;
}

export type TransactionFilter = {
  startDate: string | null;
  endDate: string | null;
  category: Category | null;
  search: string | null;
};

export type ImportProgressEvent = {
  stage: string;
  processed: number;
  total: number;
  duplicates_skipped: number;
  rules_used: number;
  llm_used: number;
};

export const categoryColors: Record<Category, string> = {
  housing: "#8B5CF6",
  utilities: "#F59E0B",
  groceries: "#10B981",
  dining: "#EF4444",
  transport: "#3B82F6",
  shopping: "#EC4899",
  entertainment: "#A855F7",
  health: "#14B8A6",
  subscriptions: "#6366F1",
  transfer: "#6B7280",
  income: "#22C55E",
  other: "#78716C"
};

export const categoryLabels: Record<Category, string> = {
  housing: "Housing",
  utilities: "Utilities",
  groceries: "Groceries",
  dining: "Dining",
  transport: "Transport",
  shopping: "Shopping",
  entertainment: "Entertainment",
  health: "Health",
  subscriptions: "Subscriptions",
  transfer: "Transfer",
  income: "Income",
  other: "Other"
};

export const categoryLabelsRu: Record<Category, string> = {
  housing: "Жильё",
  utilities: "Коммунальные",
  groceries: "Продукты",
  dining: "Кафе/доставка",
  transport: "Транспорт",
  shopping: "Покупки",
  entertainment: "Развлечения",
  health: "Здоровье",
  subscriptions: "Подписки",
  transfer: "Переводы",
  income: "Доход",
  other: "Другое"
};
