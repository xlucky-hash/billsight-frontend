import type { CSSProperties } from 'react';
import type { Direction } from '@/types/transaction';
import { EXPENSE_COLOR, INCOME_COLOR } from '@/utils/constants';
import { formatCurrency } from '@/utils/format';

interface AmountTextProps {
  value: number | string | null | undefined;
  direction?: Direction;
  colored?: boolean;
  style?: CSSProperties;
}

/** 金额展示：两位小数 + 千分位，收入绿、支出红 */
export default function AmountText({
  value,
  direction,
  colored = true,
  style,
}: AmountTextProps) {
  const color =
    colored && direction
      ? direction === 'INCOME'
        ? INCOME_COLOR
        : EXPENSE_COLOR
      : undefined;
  return (
    <span
      style={{
        color,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {formatCurrency(value)}
    </span>
  );
}
