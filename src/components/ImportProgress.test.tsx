import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImportProgress } from "./ImportProgress";

describe("ImportProgress", () => {
  it("shows stage and progress", () => {
    render(
      <ImportProgress
        open
        lang="en"
        progress={{
          stage: "categorizing",
          processed: 50,
          total: 100,
          duplicates_skipped: 10,
          rules_used: 40,
          llm_used: 5
        }}
      />
    );

    expect(screen.getByText("Categorizing")).toBeInTheDocument();
    expect(screen.getByText(/Processed:/)).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });
});

