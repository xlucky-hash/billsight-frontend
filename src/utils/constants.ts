import type { AccountType } from '@/types/account';
import type { BatchStatus, SourceType } from '@/types/importBatch';
import type { CategoryDirection } from '@/types/category';
import type { ClassifySource, Direction } from '@/types/transaction';

export const TOKEN_KEY = 'bill.token';
export const USER_KEY = 'bill.user';

export const INCOME_COLOR = '#52c41a';
export const EXPENSE_COLOR = '#f5222d';

export const CHART_COLORS = [
  '#1677ff',
  '#52c41a',
  '#faad14',
  '#eb2f96',
  '#722ed1',
  '#13c2c2',
  '#fa541c',
  '#2f54eb',
  '#a0d911',
  '#f5222d',
];

export interface OptionMeta<T extends string> {
  value: T;
  label: string;
  color: string;
}

/** 数据来源（后端按文件后缀自动判定） */
export const SOURCE_TYPE_OPTIONS: OptionMeta<SourceType>[] = [
  { value: 'OCR', label: '图片 OCR', color: 'blue' },
  { value: 'CSV', label: 'CSV 文件', color: 'cyan' },
  { value: 'EXCEL', label: 'Excel 文件', color: 'green' },
];

export const SOURCE_TYPE_META = SOURCE_TYPE_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.value]: item }),
  {} as Record<SourceType, OptionMeta<SourceType>>,
);

/** 账户类型 */
export const ACCOUNT_TYPE_OPTIONS: OptionMeta<AccountType>[] = [
  { value: 'BANK', label: '银行卡', color: 'blue' },
  { value: 'ALIPAY', label: '支付宝', color: 'cyan' },
  { value: 'WECHAT', label: '微信', color: 'green' },
  { value: 'CASH', label: '现金', color: 'gold' },
];

export const ACCOUNT_TYPE_META = ACCOUNT_TYPE_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.value]: item }),
  {} as Record<AccountType, OptionMeta<AccountType>>,
);

/** 收支方向 */
export const DIRECTION_OPTIONS: OptionMeta<Direction>[] = [
  { value: 'INCOME', label: '收入', color: 'green' },
  { value: 'EXPENSE', label: '支出', color: 'red' },
];

export const DIRECTION_META = DIRECTION_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.value]: item }),
  {} as Record<Direction, OptionMeta<Direction>>,
);

/** 分类方向（含通用） */
export const CATEGORY_DIRECTION_OPTIONS: OptionMeta<CategoryDirection>[] = [
  ...DIRECTION_OPTIONS,
  { value: 'BOTH', label: '通用', color: 'default' },
];

/** 分类来源 */
export const CLASSIFY_SOURCE_OPTIONS: OptionMeta<ClassifySource>[] = [
  { value: 'RULE', label: '规则匹配', color: 'blue' },
  { value: 'NB', label: '朴素贝叶斯', color: 'purple' },
  { value: 'LLM', label: '大模型', color: 'geekblue' },
  { value: 'MANUAL', label: '手动修正', color: 'orange' },
];

export const CLASSIFY_SOURCE_META = CLASSIFY_SOURCE_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.value]: item }),
  {} as Record<ClassifySource, OptionMeta<ClassifySource>>,
);

/** 批次状态 */
export const BATCH_STATUS_OPTIONS: OptionMeta<BatchStatus>[] = [
  { value: 'PARSING', label: '解析中', color: 'processing' },
  { value: 'PENDING_REVIEW', label: '待校对', color: 'warning' },
  { value: 'CONFIRMED', label: '已入库', color: 'success' },
  { value: 'FAILED', label: '处理失败', color: 'error' },
];

export const BATCH_STATUS_META = BATCH_STATUS_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.value]: item }),
  {} as Record<BatchStatus, OptionMeta<BatchStatus>>,
);

/** 低置信度阈值 */
export const LOW_CONFIDENCE = 0.6;
