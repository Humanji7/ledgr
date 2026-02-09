import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateFilter } from "./DateFilter";

describe("DateFilter", () => {
  it("applies custom date range on button click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DateFilter
        months={["2026-01"]}
        lang="en"
        value={{ startDate: null, endDate: null, category: null, month: null }}
        onChange={onChange}
      />
    );

    const from = screen.getByLabelText("From");
    const to = screen.getByLabelText("To");

    await user.clear(from);
    await user.type(from, "15.01.2026");
    await user.clear(to);
    await user.type(to, "23.01.2026");

    await user.click(screen.getByRole("button", { name: "Apply dates" }));

    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(last.startDate).toBe("2026-01-15");
    expect(last.endDate).toBe("2026-01-23");
  });
});
