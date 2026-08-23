import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import { CartProvider } from "@/lib/cart";
import Checkout from "./checkout";

const mockQuoteMutate = vi.fn();
const mockCreateMutate = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  useQuoteOrder: () => ({ mutate: mockQuoteMutate, data: undefined, isPending: false, isError: false, error: null }),
  useCreateOrder: () => ({ mutate: mockCreateMutate, isPending: false }),
  useGetSiteSettings: () => ({ data: null }),
  useSubscribeNewsletter: () => ({ mutate: vi.fn(), isPending: false }),
  ApiError: class ApiError extends Error {},
}));

function seedCart(items: unknown[]) {
  localStorage.setItem("afripebbles_cart_v1", JSON.stringify(items));
}

function renderCheckout() {
  return render(
    <Router base="">
      <CartProvider>
        <Checkout />
      </CartProvider>
    </Router>,
  );
}

const digitalItem = {
  productId: 1,
  quantity: 1,
  variant: null,
  snapshot: { title: "Gratitude Planner", price: 12, currency: "EUR", imageUrl: null, type: "digital" },
};

const physicalItem = {
  productId: 2,
  quantity: 1,
  variant: null,
  snapshot: { title: "Christmas Ornament", price: 25, currency: "EUR", imageUrl: null, type: "physical" },
};

describe("Checkout", () => {
  beforeEach(() => {
    mockQuoteMutate.mockReset();
    mockCreateMutate.mockReset();
  });

  it("shows an empty-cart message instead of a checkout form when the cart has no items", () => {
    renderCheckout();
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /place order/i })).not.toBeInTheDocument();
  });

  it("does not render a delivery address field for a digital-only cart", () => {
    seedCart([digitalItem]);
    renderCheckout();
    expect(screen.queryByText(/delivery address/i)).not.toBeInTheDocument();
  });

  it("requires a delivery address for a cart containing a physical item", async () => {
    const user = userEvent.setup();
    seedCart([physicalItem]);
    renderCheckout();

    await user.type(screen.getByLabelText(/full name/i), "Ama Owusu");
    await user.type(screen.getByLabelText(/^email$/i), "ama@example.com");
    await user.type(screen.getByLabelText(/phone/i), "233241234567");
    await user.type(screen.getByLabelText(/country/i), "Ghana");
    await user.click(screen.getByLabelText(/agree to the terms/i));
    await user.click(screen.getByRole("button", { name: /place order/i }));

    expect(await screen.findByText(/delivery address is required/i)).toBeInTheDocument();
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it("blocks submission without consent even when all other fields are valid", async () => {
    const user = userEvent.setup();
    seedCart([digitalItem]);
    renderCheckout();

    await user.type(screen.getByLabelText(/full name/i), "Ama Owusu");
    await user.type(screen.getByLabelText(/^email$/i), "ama@example.com");
    await user.type(screen.getByLabelText(/phone/i), "233241234567");
    await user.type(screen.getByLabelText(/country/i), "Ghana");
    await user.click(screen.getByRole("button", { name: /place order/i }));

    expect(await screen.findByText(/accept the terms/i)).toBeInTheDocument();
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it("submits the cart items (not prices) to order creation once the form is valid", async () => {
    const user = userEvent.setup();
    seedCart([digitalItem]);
    renderCheckout();

    await user.type(screen.getByLabelText(/full name/i), "Ama Owusu");
    await user.type(screen.getByLabelText(/^email$/i), "ama@example.com");
    await user.type(screen.getByLabelText(/phone/i), "233241234567");
    await user.type(screen.getByLabelText(/country/i), "Ghana");
    await user.click(screen.getByLabelText(/agree to the terms/i));
    await user.click(screen.getByRole("button", { name: /place order/i }));

    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalledTimes(1));
    const [payload] = mockCreateMutate.mock.calls[0];
    expect(payload.data.items).toEqual([{ productId: 1, quantity: 1, variant: null, varietyId: null, selections: [] }]);
    expect(payload.data.consent).toBe(true);
    // No client-computed price/total is ever part of the request body.
    expect(payload.data).not.toHaveProperty("subtotal");
    expect(payload.data).not.toHaveProperty("grandTotal");
    expect(payload.data).not.toHaveProperty("price");
  });

  it("requests a fresh quote from the server whenever the cart changes", () => {
    seedCart([digitalItem]);
    renderCheckout();
    expect(mockQuoteMutate).toHaveBeenCalledWith({
      data: { items: [{ productId: 1, quantity: 1, variant: null, varietyId: null, selections: [] }], couponCode: null },
    });
  });
});
