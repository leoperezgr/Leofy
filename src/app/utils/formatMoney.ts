export function formatMoney(value: number | string) {
  const num = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(num)) return "0";

  const hasDecimals = num % 1 !== 0;

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num);
}