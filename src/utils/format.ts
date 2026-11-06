import dayjs from 'dayjs';

/** 金额：两位小数 + 千分位 */
export function formatAmount(value: number | string | null | undefined, digits = 2): string {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** 带货币符号的金额 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  return `¥${formatAmount(value)}`;
}

/** 时间：YYYY-MM-DD HH:mm */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const d = dayjs(value);
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : '-';
}

/** 百分比 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${Math.round(value * 100)}%`;
}
