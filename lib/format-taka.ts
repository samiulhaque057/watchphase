export function formatTakaFromCents(cents: number): string {
  const amount = cents / 100;
  return `Tk ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Parses display strings like `Tk 114,000.00` into minor units (cents). */
export function parseTkLineToCents(label: string): number {
  const cleaned = label.replace(/,/g, "").replace(/Tk\s*/i, "").trim();
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100);
}
