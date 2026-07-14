// Money is always integer cents internally. These helpers are the ONLY place
// we convert to/from human-readable dollars, so rounding lives in one spot.

/** Parse user input like "$1,234.50" or "1234.5" into integer cents. */
export function dollarsToCents(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === "") return 0;
  const cleaned =
    typeof input === "number"
      ? String(input)
      : input.replace(/[^0-9.-]/g, "");
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

/** Integer cents -> a plain decimal string, e.g. 123456 -> "1234.56". */
export function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}${dollars}.${rem.toString().padStart(2, "0")}`;
}

/** Integer cents -> a currency string, e.g. 123456 -> "$1,234.56". */
export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Math.round(cents) / 100);
}
