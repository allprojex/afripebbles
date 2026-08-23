export interface DescribableOrderItem {
  variant?: { label: string; option: string } | null;
  varietyName?: string | null;
  selections?: { groupLabel: string; valueLabel: string }[] | null;
}

/**
 * One display line per detail — variety name first, then one line per
 * selected option group — shared by every place an order item's chosen
 * combination is rendered (WhatsApp text, cart, checkout, order
 * confirmation, order tracking, admin order detail), so they can never
 * drift from each other. Falls back to the legacy single-option-group pair
 * when selections/varietyName are absent (orders placed before this model
 * existed, or products still on the single-group path).
 */
export function describeOrderItem(item: DescribableOrderItem): string[] {
  const lines: string[] = [];
  if (item.varietyName) lines.push(item.varietyName);
  for (const sel of item.selections ?? []) {
    lines.push(`${sel.groupLabel}: ${sel.valueLabel}`);
  }
  if (lines.length === 0 && item.variant) {
    lines.push(`${item.variant.label}: ${item.variant.option}`);
  }
  return lines;
}
