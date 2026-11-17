import dayjs from 'dayjs';
import type { Account } from '@/types/account';
import type { UserInfo } from '@/types/auth';
import type { Category } from '@/types/category';
import type { ImportBatch, ImportRecord } from '@/types/importBatch';
import type { Correction, Rule } from '@/types/rule';
import type { ClassifySource, Transaction } from '@/types/transaction';

export const FIXED_TOKEN = 'mock-jwt-token-bill-2026';

export const MOCK_USER: UserInfo = {
  id: 1,
  username: 'admin',
  name: '财务小助手',
};

/** 4.1 分类（平铺，parentId 组树） */
export const ALL_CATEGORIES: Category[] = [
  { id: 100, parentId: null, name: '支出', direction: 'EXPENSE', icon: '💸', sort: 1, builtin: 1 },
  { id: 101, parentId: 100, name: '餐饮', direction: 'EXPENSE', icon: '🍔', sort: 1, builtin: 1 },
  { id: 102, parentId: 100, name: '交通', direction: 'EXPENSE', icon: '🚇', sort: 2, builtin: 1 },
  { id: 103, parentId: 100, name: '购物', direction: 'EXPENSE', icon: '🛍️', sort: 3, builtin: 1 },
  { id: 104, parentId: 100, name: '居住', direction: 'EXPENSE', icon: '🏠', sort: 4, builtin: 1 },
  { id: 105, parentId: 100, name: '娱乐', direction: 'EXPENSE', icon: '🎬', sort: 5, builtin: 1 },
  { id: 106, parentId: 100, name: '医疗', direction: 'EXPENSE', icon: '💊', sort: 6, builtin: 1 },
  { id: 200, parentId: null, name: '收入', direction: 'INCOME', icon: '💰', sort: 2, builtin: 1 },
  { id: 201, parentId: 200, name: '工资', direction: 'INCOME', icon: '💼', sort: 1, builtin: 1 },
  { id: 202, parentId: 200, name: '兼职', direction: 'INCOME', icon: '🧑‍💻', sort: 2, builtin: 1 },
  { id: 203, parentId: 200, name: '理财', direction: 'INCOME', icon: '📈', sort: 3, builtin: 1 },
  { id: 204, parentId: 200, name: '红包', direction: 'INCOME', icon: '🧧', sort: 4, builtin: 1 },
];

export const CATEGORY_NAME_MAP: Record<number, string> = ALL_CATEGORIES.reduce(
  (acc, item) => ({ ...acc, [item.id]: item.name }),
  {},
);

/** 传入一级分类时，连同其二级分类一起返回 */
export function categoryIdsOf(categoryId: number): number[] {
  return [
    categoryId,
    ...ALL_CATEGORIES.filter((item) => item.parentId === categoryId).map((item) => item.id),
  ];
}

export const accounts: Account[] = [
  {
    id: 1,
    name: '招商银行储蓄卡',
    type: 'BANK',
    balance: 23650.88,
    createTime: '2025-01-12T09:30:00',
  },
  {
    id: 2,
    name: '支付宝余额',
    type: 'ALIPAY',
    balance: 3280.5,
    createTime: '2025-03-02T14:20:00',
  },
  {
    id: 3,
    name: '微信钱包',
    type: 'WECHAT',
    balance: 1250,
    createTime: '2025-05-18T20:10:00',
  },
  {
    id: 4,
    name: '现金随身',
    type: 'CASH',
    balance: null,
    createTime: '2025-07-01T10:00:00',
  },
  {
    id: 5,
    name: '平安银行储蓄卡',
    type: 'BANK',
    balance: 5600.3,
    createTime: '2025-09-09T16:45:00',
  },
];

interface MerchantTemplate {
  counterparty: string;
  summary: string;
  categoryId: number;
  amount: number;
  direction: 'INCOME' | 'EXPENSE';
}

const EXPENSE_TEMPLATES: MerchantTemplate[] = [
  { counterparty: '星巴克', summary: '咖啡', categoryId: 101, amount: 32.5, direction: 'EXPENSE' },
  { counterparty: '美团外卖', summary: '午餐', categoryId: 101, amount: 28.8, direction: 'EXPENSE' },
  { counterparty: '地铁通勤', summary: '地铁', categoryId: 102, amount: 6, direction: 'EXPENSE' },
  { counterparty: '滴滴出行', summary: '快车', categoryId: 102, amount: 35.6, direction: 'EXPENSE' },
  { counterparty: '京东商城', summary: '日用品', categoryId: 103, amount: 199, direction: 'EXPENSE' },
  { counterparty: '山姆会员店', summary: '生鲜采购', categoryId: 103, amount: 268.4, direction: 'EXPENSE' },
  { counterparty: '万达影城', summary: '电影票', categoryId: 105, amount: 45, direction: 'EXPENSE' },
  { counterparty: '房租', summary: '月度房租', categoryId: 104, amount: 3500, direction: 'EXPENSE' },
  { counterparty: '国家电网', summary: '水电网费', categoryId: 104, amount: 186.3, direction: 'EXPENSE' },
  { counterparty: '益丰大药房', summary: '常用药', categoryId: 106, amount: 56.8, direction: 'EXPENSE' },
  { counterparty: '中国石油', summary: '加油', categoryId: 102, amount: 300, direction: 'EXPENSE' },
];

const INCOME_TEMPLATES: MerchantTemplate[] = [
  { counterparty: '某某科技有限公司', summary: '月度工资', categoryId: 201, amount: 12000, direction: 'INCOME' },
  { counterparty: '设计外包项目', summary: '兼职报酬', categoryId: 202, amount: 3000, direction: 'INCOME' },
  { counterparty: '基金分红', summary: '理财收益', categoryId: 203, amount: 260, direction: 'INCOME' },
  { counterparty: '朋友转账', summary: '生日红包', categoryId: 204, amount: 100, direction: 'INCOME' },
];

let nextTransactionId = 10000;

function buildTransaction(
  template: MerchantTemplate,
  account: Account,
  monthOffset: number,
  day: number,
  confidence: number,
  classifySource: ClassifySource,
): Transaction {
  const txnTime = dayjs()
    .subtract(monthOffset, 'month')
    .date(day)
    .hour(8 + (day % 10))
    .minute((day * 7) % 60)
    .second(0)
    .format('YYYY-MM-DDTHH:mm:ss');
  nextTransactionId += 1;
  return {
    id: nextTransactionId,
    accountId: account.id,
    accountName: account.name,
    categoryId: template.categoryId,
    categoryName: CATEGORY_NAME_MAP[template.categoryId],
    txnTime,
    amount: template.amount,
    direction: template.direction,
    counterparty: template.counterparty,
    summary: template.summary,
    confidence,
    classifySource,
  };
}

/** 历史交易：近 6 个月，约 80 条 */
export const transactions: Transaction[] = (() => {
  const result: Transaction[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    EXPENSE_TEMPLATES.forEach((template, index) => {
      const account = accounts[(index + offset) % accounts.length];
      const amount = Number((template.amount + offset * 3.5 + index * 1.2).toFixed(2));
      const source: ClassifySource =
        index % 4 === 0 ? 'NB' : index % 4 === 1 ? 'RULE' : index % 4 === 2 ? 'LLM' : 'MANUAL';
      const item = buildTransaction(
        { ...template, amount },
        account,
        offset,
        2 + ((index * 3 + offset) % 26),
        index % 3 === 0 ? 0.55 : 0.68 + (index % 4) * 0.08,
        source,
      );
      result.push(item);
    });
    INCOME_TEMPLATES.forEach((template, index) => {
      if (index >= 2 && offset !== 0) return;
      const item = buildTransaction(
        template,
        accounts[index % accounts.length],
        offset,
        5 + index * 10,
        0.96,
        'RULE',
      );
      result.push(item);
    });
  }
  return result;
})();

/** 待校对记录示例（ImportRecord 结构） */
export function createReviewItems(startId = 50000): ImportRecord[] {
  const templates = [
    { counterparty: '肯德基', summary: '早餐', categoryId: 101, amount: 22.5, confidence: 0.45, source: 'NB' as const },
    { counterparty: '哈啰单车', summary: '骑行', categoryId: 102, amount: 3.5, confidence: 0.58, source: 'NB' as const },
    { counterparty: '淘宝', summary: '家电配件', categoryId: 103, amount: 128, confidence: 0.92, source: 'RULE' as const },
    { counterparty: '链家', summary: '物业费', categoryId: 104, amount: 420, confidence: 0.37, source: 'LLM' as const },
    { counterparty: '网易云音乐', summary: '会员订阅', categoryId: 105, amount: 15, confidence: 0.66, source: 'NB' as const },
    { counterparty: '社区医院', summary: '门诊挂号', categoryId: 106, amount: 30, confidence: 0.74, source: 'RULE' as const },
    { counterparty: '未知商户 A', summary: '扫码付款', categoryId: null, amount: 88.8, confidence: 0.32, source: 'LLM' as const },
    { counterparty: '百果园', summary: '水果', categoryId: 101, amount: 46.9, confidence: 0.81, source: 'RULE' as const },
  ];
  return templates.map((template, index) => ({
    txnId: startId + index,
    txnTime: dayjs()
      .subtract(index, 'day')
      .hour(9 + index)
      .minute(index * 5)
      .second(0)
      .format('YYYY-MM-DDTHH:mm:ss'),
    amount: template.amount,
    counterparty: template.counterparty,
    summary: template.summary,
    systemCategoryId: template.categoryId,
    systemCategoryName: template.categoryId ? CATEGORY_NAME_MAP[template.categoryId] : '未分类',
    classifySource: template.source,
    confidence: template.confidence,
    status: 'PENDING_REVIEW',
  }));
}

/** 批次内部存储：契约字段 + 解析所需的归属账户 */
export interface BatchStore extends ImportBatch {
  accountId?: number;
  objectKey?: string | null;
}

export let batches: BatchStore[] = [
  {
    batchId: '5001',
    sourceType: 'EXCEL',
    status: 'FAILED',
    totalCount: 0,
    successCount: 0,
    failReason: '文件解析失败：第 12 行缺少交易金额列',
    createdAt: '2026-10-20T09:05:00',
    accountId: 1,
    objectKey: '1/202610/mock-expired.xls',
  },
  {
    batchId: '5002',
    sourceType: 'CSV',
    status: 'CONFIRMED',
    totalCount: 18,
    successCount: 18,
    failReason: null,
    createdAt: '2026-10-02T10:12:00',
    accountId: 1,
    objectKey: '1/202610/bank-september.csv',
  },
  {
    batchId: '5003',
    sourceType: 'OCR',
    status: 'PENDING_REVIEW',
    totalCount: 8,
    successCount: 8,
    failReason: null,
    createdAt: '2026-10-15T21:30:00',
    accountId: 2,
    objectKey: '1/202610/alipay.png',
  },
  {
    batchId: '5004',
    sourceType: 'CSV',
    status: 'PARSING',
    totalCount: 0,
    successCount: 0,
    failReason: null,
    createdAt: '2026-11-01T08:40:00',
    accountId: 3,
    objectKey: '1/202611/wechat.csv',
  },
];

export const reviewItemsByBatch: Record<string, ImportRecord[]> = {
  '5003': createReviewItems(50030),
};

export let rules: Rule[] = [
  {
    id: 1,
    feature: '星巴克',
    categoryId: 101,
    categoryName: '餐饮',
    hitCount: 12,
    updatedAt: '2026-11-02T09:00:00',
  },
  {
    id: 2,
    feature: '滴滴',
    categoryId: 102,
    categoryName: '交通',
    hitCount: 8,
    updatedAt: '2026-10-28T16:40:00',
  },
  {
    id: 3,
    feature: '工资',
    categoryId: 201,
    categoryName: '工资',
    hitCount: 6,
    updatedAt: '2026-11-01T09:15:00',
  },
  {
    id: 4,
    feature: '山姆',
    categoryId: 103,
    categoryName: '购物',
    hitCount: 4,
    updatedAt: '2026-10-21T11:05:00',
  },
];

export let corrections: Correction[] = [
  {
    id: 1,
    txnId: 10086,
    feature: '肯德基',
    fromCategoryName: '未分类',
    toCategoryName: '餐饮',
    fromSource: 'NB',
    createdAt: '2026-10-16T12:30:00',
  },
  {
    id: 2,
    txnId: 10091,
    feature: '哈啰单车',
    fromCategoryName: '餐饮',
    toCategoryName: '交通',
    fromSource: 'LLM',
    createdAt: '2026-10-18T18:12:00',
  },
  {
    id: 3,
    txnId: 10112,
    feature: '社区医院',
    fromCategoryName: '未分类',
    toCategoryName: '医疗',
    fromSource: 'NB',
    createdAt: '2026-10-22T09:45:00',
  },
  {
    id: 4,
    txnId: 10133,
    feature: '网易云音乐',
    fromCategoryName: '购物',
    toCategoryName: '娱乐',
    fromSource: 'RULE',
    createdAt: '2026-10-27T20:08:00',
  },
  {
    id: 5,
    txnId: 10201,
    feature: '美团外卖',
    fromCategoryName: '娱乐',
    toCategoryName: '餐饮',
    fromSource: 'NB',
    createdAt: '2026-11-02T13:26:00',
  },
];

let nextBatchId = Math.max(...batches.map((item) => Number(item.batchId))) + 1;
let nextCorrectionId = Math.max(...corrections.map((item) => item.id)) + 1;
let nextReviewId = 60000;

export function nextBatchSeq(): string {
  const id = String(nextBatchId);
  nextBatchId += 1;
  return id;
}

export function nextReviewTxnId(): number {
  const id = nextReviewId;
  nextReviewId += 10;
  return id;
}

export function nextCorrectionSeq(): number {
  const id = nextCorrectionId;
  nextCorrectionId += 1;
  return id;
}

export function setBatches(next: BatchStore[]): void {
  batches = next;
}

export function setRules(next: Rule[]): void {
  rules = next;
}

export function setCorrections(next: Correction[]): void {
  corrections = next;
}
