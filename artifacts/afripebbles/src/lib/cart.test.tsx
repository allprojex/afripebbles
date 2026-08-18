import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartProvider, useCart, type CartItem } from "./cart";

const snapshot = { title: "Sample Product", price: 20, currency: "EUR", imageUrl: null, type: "physical" as const };

function TestHarness() {
  const { items, itemCount, addItem, removeItem, updateQuantity, clear } = useCart();
  return (
    <div>
      <div data-testid="count">{itemCount}</div>
      <div data-testid="lines">{items.length}</div>
      <button onClick={() => addItem({ productId: 1, quantity: 1, variant: null, snapshot })}>Add plain</button>
      <button onClick={() => addItem({ productId: 1, quantity: 1, variant: { label: "Size", option: "M" }, snapshot })}>Add variant M</button>
      <button onClick={() => addItem({ productId: 1, quantity: 1, variant: { label: "Size", option: "L" }, snapshot })}>Add variant L</button>
      <button onClick={() => updateQuantity(1, null, 5)}>Set plain qty 5</button>
      <button onClick={() => updateQuantity(1, null, 0)}>Zero plain qty</button>
      <button onClick={() => removeItem(1, null)}>Remove plain</button>
      <button onClick={() => clear()}>Clear</button>
    </div>
  );
}

function renderHarness() {
  return render(
    <CartProvider>
      <TestHarness />
    </CartProvider>,
  );
}

describe("cart", () => {
  it("adds an item and reflects it in the item count", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("Add plain"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("lines")).toHaveTextContent("1");
  });

  it("merges quantity for the same product + same variant instead of duplicating the line", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("Add plain"));
    await user.click(screen.getByText("Add plain"));
    expect(screen.getByTestId("lines")).toHaveTextContent("1");
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  it("treats different variants of the same product as separate cart lines", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("Add variant M"));
    await user.click(screen.getByText("Add variant L"));
    expect(screen.getByTestId("lines")).toHaveTextContent("2");
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  it("updates quantity for a specific line", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("Add plain"));
    await user.click(screen.getByText("Set plain qty 5"));
    expect(screen.getByTestId("count")).toHaveTextContent("5");
  });

  it("removes the line entirely when quantity is set to 0", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("Add plain"));
    await user.click(screen.getByText("Zero plain qty"));
    expect(screen.getByTestId("lines")).toHaveTextContent("0");
  });

  it("removes a line via removeItem", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("Add plain"));
    await user.click(screen.getByText("Remove plain"));
    expect(screen.getByTestId("lines")).toHaveTextContent("0");
  });

  it("clears the whole cart", async () => {
    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("Add variant M"));
    await user.click(screen.getByText("Add variant L"));
    await user.click(screen.getByText("Clear"));
    expect(screen.getByTestId("lines")).toHaveTextContent("0");
  });

  it("persists cart contents to localStorage and restores them on next mount", async () => {
    const user = userEvent.setup();
    const { unmount } = renderHarness();
    await user.click(screen.getByText("Add plain"));
    unmount();

    renderHarness();
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("throws a clear error if useCart is used outside a CartProvider", () => {
    function Broken() {
      useCart();
      return null;
    }
    expect(() => render(<Broken />)).toThrow(/CartProvider/);
  });
});

// Exercise the exported type so a future refactor that breaks the shape fails to compile.
const _typeCheck: CartItem = { productId: 1, quantity: 1, variant: null, snapshot };
void _typeCheck;
