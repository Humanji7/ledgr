import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransactionTable } from "./TransactionTable";
import type { Transaction } from "@/types";

describe("TransactionTable", () => {
  it("renders category source label", () => {
    const onChangeCategory = vi.fn();
    const txns: Transaction[] = [
      {
        id: "1",
        date: "2026-01-15",
        description: "WHOLE FOODS MARKET",
        amount: -45.67,
        category: "groceries",
        category_source: "rule",
        category_reason: "RULE:GROCERIES",
        source_file: "x.csv",
        hash: "h",
        created_at: "2026-01-15T00:00:00Z"
      }
    ];

    render(<TransactionTable lang="en" transactions={txns} onChangeCategory={onChangeCategory} />);

    expect(screen.getByText("Rule")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
  });
});

