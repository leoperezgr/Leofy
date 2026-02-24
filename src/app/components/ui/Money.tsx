import { formatMoney } from "../../utils/formatMoney";

interface MoneyProps {
  value: number | string;
  currency?: boolean;
}

export function Money({ value, currency = false }: MoneyProps) {
  const formatted = formatMoney(value);

  return <span>{currency ? `$${formatted}` : formatted}</span>;
}