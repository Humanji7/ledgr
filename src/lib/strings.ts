import type { Category } from "@/types";
import { categoryLabels, categoryLabelsRu } from "@/types";

export type Language = "en" | "ru";

export const languageOptions: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" }
];

export function getCategoryLabelMap(lang: Language): Record<Category, string> {
  return lang === "ru" ? categoryLabelsRu : categoryLabels;
}

export function formatCurrency(amount: number, lang: Language): string {
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(amount);
}

const MONTHS: Record<Language, string[]> = {
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ],
  ru: [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь"
  ]
};

export function formatMonthLabel(yyyyMm: string, lang: Language): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  const name = MONTHS[lang][(m ?? 1) - 1] ?? yyyyMm;
  return `${name} ${y}`;
}

export function getCategorySourceLabel(lang: Language, source: string): string {
  const s = strings[lang];
  switch (source) {
    case "rule":
      return s.categorySourceRule;
    case "learned_rule":
      return s.categorySourceLearned;
    case "llm":
      return s.categorySourceLlm;
    case "manual":
      return s.categorySourceManual;
    case "unknown":
      return s.categorySourceUnknown;
    default:
      return source;
  }
}

export const strings: Record<Language, Record<string, string>> = {
  en: {
    loading: "Loading…",
    settings: "Settings",
    close: "Close",
    language: "Language",
    export: "Export",
    importCsv: "Import CSV",
    clear: "Clear",
    filters: "Filters",
    search: "Search",
    searchPlaceholder: "Search description or category…",
    budgets: "Budgets",
    manage: "Manage",
    hide: "Hide",
    view: "View",
    learnedRules: "Learned Rules",
    learnedRulesHint: "When you manually change a category, Ledgr learns a rule for the exact description.",
    spendingByCategory: "Spending by Category",
    quickImport: "Quick Import",
    helpTitle: "How to use Ledgr",
    showHelp: "Show Help",
    resetData: "Reset Data",
    resetDataConfirmTitle: "Reset Data",
    resetDataConfirmText:
      "This will delete all transactions, budgets, and learned rules from this device. Model selection and language will be kept.\n\nContinue?",
    resetDone: "Data reset. Import a CSV to start again.",
    tableShowing: "Showing",
    tableTransactions: "transactions",
    tableDate: "Date",
    tableDescription: "Description",
    tableAmount: "Amount",
    tableCategory: "Category",
    tableChange: "Change",
    tableEmpty: "No transactions to show. Import a CSV or adjust your filters.",
    pieEmpty: "No spending data yet.",
    budgetsEmpty: "No budgets set yet.",
    budgetsStatusFor: "Budget status for",
    remaining: "Remaining",
    modelSetupTitle: "Model Setup",
    modelSetupBody:
      "Ledgr runs fully offline. To categorize transactions, select your local GGUF model file (e.g. qwen2.5-1.5b-instruct-q4_k_m.gguf).",
    selectModel: "Select Model File",
    selecting: "Selecting...",
    model: "Model",
    modelReady: "Model selected",
    modelMissing: "No model selected",
    importProgressTitle: "Importing...",
    importProgressBody: "This can take a while for large CSVs, especially on first run.",
    dropzoneTitle: "Drop a CSV anywhere in the window",
    dropzoneSubtitle: "or use the Import button",
    last: "Last",
    filtersPeriod: "Period",
    filtersCategory: "Category",
    filtersFrom: "From",
    filtersTo: "To",
    allTime: "All Time",
    allCategories: "All categories",
    customRange: "Custom range…",
    appliedAllTime: "Applied: All time",
    applied: "Applied",
    applyDates: "Apply dates",
    invalidFrom: "Invalid From date. Use DD.MM.YYYY (e.g. 15.01.2026) or YYYY-MM-DD.",
    invalidTo: "Invalid To date. Use DD.MM.YYYY (e.g. 23.01.2026) or YYYY-MM-DD.",
    invalidRange: "Date range is invalid: From must be before To.",
    totalSpending: "Total Spending",
    totalIncome: "Total Income",
    transactionsCount: "Transactions",
    saveAll: "Save all",
    budgetsHint: "Set monthly spending limits per category.",
    delete: "Delete",
    budgetsTip: "Tip: Leave a field empty to keep it unset.",
    rulesEmpty: "No learned rules yet.",
    rulesPattern: "Pattern",
    rulesUses: "Uses",
    categorySourceRule: "Rule",
    categorySourceLearned: "Learned",
    categorySourceLlm: "LLM",
    categorySourceManual: "Manual",
    categorySourceUnknown: "Unknown",
    importStageParsing: "Parsing CSV",
    importStageDedup: "Checking duplicates",
    importStageCategorizing: "Categorizing",
    importStageInserting: "Saving to database",
    importStageDone: "Done",
    importCounts: "Processed",
    importMetricDuplicates: "duplicates",
    importMetricRules: "rules",
    importMetricLlm: "llm",
    autoLearnRules: "Auto-learn rules",
    autoLearnRulesHint: "When you change a category, Ledgr saves a learned rule for this exact description.",
    modelOptionalHint: "Model is optional. Add it to categorize unknown merchants with LLM.",
    enabled: "Enabled",
    disabledLabel: "Disabled",
    wizardWelcomeTitle: "AI Categorization Setup",
    wizardWelcomeBody:
      "Ledgr can automatically categorize your transactions using AI. For this, you need a small model file (~1 GB) that runs entirely on your computer. Your data never leaves your device.",
    wizardDownloadTitle: "Download the Model",
    wizardDownloadBody:
      "Click the button below to open the download page. The file is about 1 GB — download may take a few minutes.",
    wizardDownloadHint: "After downloading, come back here and click \"Next\".",
    wizardSelectTitle: "Select the Model File",
    wizardSelectBody: "Click the button below and choose the .gguf file you just downloaded.",
    wizardDoneTitle: "All Set!",
    wizardDoneBody:
      "The model is configured. Ledgr will now automatically categorize your transactions using AI.",
    wizardSkippedTitle: "Setup Complete",
    wizardSkippedBody:
      "You can use Ledgr without a model — transactions will be categorized by rules only. You can add a model later in Settings.",
    wizardSkip: "Skip for now",
    wizardBack: "Back",
    wizardNext: "Next",
    wizardStart: "Start using Ledgr",
    wizardOpenLink: "Open Download Page",
    wizardDownloaded: "I've downloaded it",
    wizardSelectFile: "Select .gguf File"
  },
  ru: {
    loading: "Загрузка…",
    settings: "Настройки",
    close: "Закрыть",
    language: "Язык",
    export: "Экспорт",
    importCsv: "Импорт CSV",
    clear: "Сбросить",
    filters: "Фильтры",
    search: "Поиск",
    searchPlaceholder: "Поиск по описанию или категории…",
    budgets: "Бюджеты",
    manage: "Управлять",
    hide: "Скрыть",
    view: "Смотреть",
    learnedRules: "Выученные правила",
    learnedRulesHint:
      "Когда вы вручную меняете категорию, Ledgr запоминает правило для точного описания транзакции.",
    spendingByCategory: "Расходы по категориям",
    quickImport: "Быстрый импорт",
    helpTitle: "Как пользоваться Ledgr",
    showHelp: "Показать подсказки",
    resetData: "Сбросить данные",
    resetDataConfirmTitle: "Сброс данных",
    resetDataConfirmText:
      "Будут удалены все транзакции, бюджеты и выученные правила на этом устройстве. Выбор модели и язык сохранятся.\n\nПродолжить?",
    resetDone: "Данные сброшены. Импортируйте CSV, чтобы начать заново.",
    tableShowing: "Показано",
    tableTransactions: "транзакций",
    tableDate: "Дата",
    tableDescription: "Описание",
    tableAmount: "Сумма",
    tableCategory: "Категория",
    tableChange: "Изменить",
    tableEmpty: "Нет транзакций. Импортируйте CSV или измените фильтры.",
    pieEmpty: "Пока нет данных по расходам.",
    budgetsEmpty: "Бюджеты не заданы.",
    budgetsStatusFor: "Статус бюджетов за",
    remaining: "Остаток",
    modelSetupTitle: "Настройка модели",
    modelSetupBody:
      "Ledgr работает полностью офлайн. Для категоризации выберите локальный GGUF-файл модели (например qwen2.5-1.5b-instruct-q4_k_m.gguf).",
    selectModel: "Выбрать файл модели",
    selecting: "Выбор…",
    model: "Модель",
    modelReady: "Модель выбрана",
    modelMissing: "Модель не выбрана",
    importProgressTitle: "Импорт…",
    importProgressBody: "Импорт больших CSV может занять время, особенно при первом запуске.",
    dropzoneTitle: "Перетащите CSV в окно приложения",
    dropzoneSubtitle: "или используйте кнопку «Импорт CSV»",
    last: "Последний",
    filtersPeriod: "Период",
    filtersCategory: "Категория",
    filtersFrom: "С",
    filtersTo: "По",
    allTime: "За всё время",
    allCategories: "Все категории",
    customRange: "Свой диапазон…",
    appliedAllTime: "Применено: за всё время",
    applied: "Применено",
    applyDates: "Применить даты",
    invalidFrom: "Неверная дата «С». Используйте ДД.ММ.ГГГГ (например 15.01.2026) или ГГГГ-ММ-ДД.",
    invalidTo: "Неверная дата «По». Используйте ДД.ММ.ГГГГ (например 23.01.2026) или ГГГГ-ММ-ДД.",
    invalidRange: "Неверный диапазон: дата «С» должна быть раньше «По».",
    totalSpending: "Расходы",
    totalIncome: "Доходы",
    transactionsCount: "Транзакции",
    saveAll: "Сохранить",
    budgetsHint: "Задайте месячные лимиты по категориям.",
    delete: "Удалить",
    budgetsTip: "Подсказка: оставьте поле пустым, чтобы не задавать лимит.",
    rulesEmpty: "Пока нет выученных правил.",
    rulesPattern: "Шаблон",
    rulesUses: "Использований",
    categorySourceRule: "Правило",
    categorySourceLearned: "Выучено",
    categorySourceLlm: "LLM",
    categorySourceManual: "Вручную",
    categorySourceUnknown: "Неизвестно",
    importStageParsing: "Парсинг CSV",
    importStageDedup: "Проверка дублей",
    importStageCategorizing: "Категоризация",
    importStageInserting: "Сохранение в базу",
    importStageDone: "Готово",
    importCounts: "Обработано",
    importMetricDuplicates: "дубли",
    importMetricRules: "правила",
    importMetricLlm: "llm",
    autoLearnRules: "Авто‑обучение правил",
    autoLearnRulesHint: "При изменении категории Ledgr сохранит выученное правило для точного описания транзакции.",
    modelOptionalHint: "Модель не обязательна. Добавьте её, чтобы категоризировать неизвестных мерчантов через LLM.",
    enabled: "Включено",
    disabledLabel: "Выключено",
    wizardWelcomeTitle: "Настройка AI-категоризации",
    wizardWelcomeBody:
      "Ledgr может автоматически распознавать ваши траты с помощью AI. Для этого нужен файл модели (~1 ГБ), который будет работать полностью на вашем компьютере. Ваши данные никуда не отправляются.",
    wizardDownloadTitle: "Скачайте модель",
    wizardDownloadBody:
      "Нажмите кнопку ниже, чтобы открыть страницу скачивания. Файл весит около 1 ГБ — скачивание может занять несколько минут.",
    wizardDownloadHint: "После скачивания вернитесь сюда и нажмите «Далее».",
    wizardSelectTitle: "Выберите файл модели",
    wizardSelectBody: "Нажмите кнопку ниже и выберите скачанный файл .gguf.",
    wizardDoneTitle: "Готово!",
    wizardDoneBody:
      "Модель настроена. Теперь Ledgr будет автоматически категоризировать ваши транзакции с помощью AI.",
    wizardSkippedTitle: "Настройка завершена",
    wizardSkippedBody:
      "Вы можете использовать Ledgr без модели — транзакции будут категоризированы только по правилам. Добавить модель можно позже в настройках.",
    wizardSkip: "Пропустить",
    wizardBack: "Назад",
    wizardNext: "Далее",
    wizardStart: "Начать работу",
    wizardOpenLink: "Открыть страницу скачивания",
    wizardDownloaded: "Я скачал",
    wizardSelectFile: "Выбрать файл .gguf"
  }
};

export function toastImported(
  lang: Language,
  imported: number,
  rulesUsed: number,
  llmUsed: number,
  duplicatesSkipped: number,
  warnings: number
): string {
  if (lang === "ru") {
    const parts = [`Импортировано ${imported} (правила ${rulesUsed}, LLM ${llmUsed})`];
    if (duplicatesSkipped) parts.push(`пропущено дублей ${duplicatesSkipped}`);
    if (warnings) parts.push(`предупреждений ${warnings}`);
    return parts.join(", ");
  }
  const parts = [`Imported ${imported} (rules ${rulesUsed}, LLM ${llmUsed})`];
  if (duplicatesSkipped) parts.push(`skipped ${duplicatesSkipped} duplicates`);
  if (warnings) parts.push(`${warnings} warnings`);
  return parts.join(", ");
}

export function toastExported(lang: Language, count: number): string {
  return lang === "ru" ? `Экспортировано транзакций: ${count}` : `Exported ${count} transactions`;
}
