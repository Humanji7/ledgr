import { describe, expect, it } from "vitest";
import { formatMonthLabel, getCategorySourceLabel, strings } from "./strings";

describe("strings", () => {
  it("formats month labels", () => {
    expect(formatMonthLabel("2026-01", "en")).toBe("January 2026");
    expect(formatMonthLabel("2026-01", "ru")).toBe("Январь 2026");
  });

  it("maps category sources to labels", () => {
    expect(getCategorySourceLabel("en", "rule")).toBe(strings.en.categorySourceRule);
    expect(getCategorySourceLabel("en", "manual")).toBe(strings.en.categorySourceManual);
    expect(getCategorySourceLabel("ru", "learned_rule")).toBe(strings.ru.categorySourceLearned);
    expect(getCategorySourceLabel("en", "unknown")).toBe(strings.en.categorySourceUnknown);
    expect(getCategorySourceLabel("en", "something_else")).toBe("something_else");
  });
});

