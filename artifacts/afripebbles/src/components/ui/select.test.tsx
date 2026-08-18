import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import userEvent from "@testing-library/user-event";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

/**
 * Regression coverage for a real production bug: a controlled Select whose
 * value is set asynchronously (e.g. react-hook-form's `reset()` after an API
 * response arrives, before the dropdown has ever been opened) rendered blank
 * even though the underlying value was correct. Root cause: Radix's hidden
 * native <select> fallback fires a spurious onValueChange("") the first time
 * a controlled value changes before its <option> has registered. See
 * select.tsx for the fix — this file proves it holds for the pattern used
 * throughout the admin (Controller + value/onValueChange, no defaultValue).
 */

type Values = { status: string };

function AsyncLoadedSelect({ loadedValue }: { loadedValue: string }) {
  const form = useForm<Values>({ defaultValues: { status: "draft" } });

  useEffect(() => {
    // Mirrors every admin edit form: mount with local defaults, then reset
    // once async data (a query result) arrives.
    form.reset({ status: loadedValue });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedValue]);

  return (
    <Controller
      control={form.control}
      name="status"
      render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      )}
    />
  );
}

describe("Select — controlled value set after async load", () => {
  it("displays the loaded value's label, not blank, without ever opening the dropdown", async () => {
    render(<AsyncLoadedSelect loadedValue="published" />);
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveTextContent("Published"));
  });

  it("never leaves the trigger blank for a value that differs from the initial default", async () => {
    render(<AsyncLoadedSelect loadedValue="archived" />);
    await waitFor(() => {
      const trigger = screen.getByRole("combobox");
      expect(trigger.textContent).not.toBe("");
      expect(trigger).toHaveTextContent("Archived");
    });
  });

  it("still responds to a real user selection made by opening the dropdown and picking an item", async () => {
    const user = userEvent.setup();

    function ControlledSelect() {
      const form = useForm<Values>({ defaultValues: { status: "draft" } });
      return (
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      );
    }

    render(<ControlledSelect />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Draft");

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Published" }));

    await waitFor(() => expect(screen.getByRole("combobox")).toHaveTextContent("Published"));
  });
});
