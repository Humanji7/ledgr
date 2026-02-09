import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsDialog } from "./SettingsDialog";

describe("SettingsDialog", () => {
  it("toggles auto-learn and triggers model select", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onChangeLanguage = vi.fn();
    const onSelectModel = vi.fn();
    const onChangeAutoLearnRules = vi.fn();

    render(
      <SettingsDialog
        open
        lang="en"
        modelReady={false}
        autoLearnRules={true}
        onClose={onClose}
        onChangeLanguage={onChangeLanguage}
        onSelectModel={onSelectModel}
        onChangeAutoLearnRules={onChangeAutoLearnRules}
      />
    );

    await user.click(screen.getByRole("button", { name: "Select Model File" }));
    expect(onSelectModel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("checkbox"));
    expect(onChangeAutoLearnRules).toHaveBeenCalledWith(false);
  });
});

