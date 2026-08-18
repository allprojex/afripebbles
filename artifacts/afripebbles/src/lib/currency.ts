const SYMBOL_BY_CURRENCY: Record<string, string> = {
  GHS: "GH₵",
  EUR: "€",
  USD: "$",
};

/** No Intl.NumberFormat locale data is assumed available for GHS, so amounts are formatted by hand rather than risk an inconsistent browser-dependent symbol/spacing. */
export function formatCurrency(amount: number, currency: string): string {
  const symbol = SYMBOL_BY_CURRENCY[currency] ?? `${currency} `;
  return `${symbol}${amount.toFixed(2)}`;
}
