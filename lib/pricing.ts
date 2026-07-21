// Wholesale pricing resolution. Pure functions, integer cents only.
//
// A variation's wholesale unit price is resolved in this order:
//   1. An explicit per-variation wholesale price, if set — it wins outright.
//   2. Otherwise MSRP minus a percentage discount, where the percentage is the
//      contact's own override if set, else the global default from settings.

/** The discount % that applies to a contact (their override, else the default). */
export function effectiveDiscountPercent(
  contactDiscount: number | null | undefined,
  defaultDiscount: number
): number {
  const pct = contactDiscount ?? defaultDiscount ?? 0;
  return Math.min(100, Math.max(0, pct));
}

/** Resolve one variation's wholesale unit price (cents) for a given discount. */
export function wholesaleUnitPriceCents(
  msrpCents: number,
  explicitWholesaleCents: number | null | undefined,
  discountPercent: number
): number {
  if (explicitWholesaleCents != null) return Math.max(0, Math.round(explicitWholesaleCents));
  const pct = Math.min(100, Math.max(0, discountPercent));
  return Math.max(0, Math.round(msrpCents * (1 - pct / 100)));
}
