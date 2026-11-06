export type Direction = 'INCOME' | 'EXPENSE';

/** 分类来源：规则匹配 / 朴素贝叶斯 / 大模型 / 手动修正 */
export type ClassifySource = 'RULE' | 'NB' | 'LLM' | 'MANUAL';

/** 6.1 交易 */
export interface Transaction {
  id: number;
  batchId?: string | null;
  txnTime: string;
  amount: number;
  direction: Direction;
  counterparty: string;
  summary: string;
  categoryId: number | null;
  categoryName?: string;
  accountId: number;
  accountName?: string;
  classifySource: ClassifySource;
  confidence: number;
}

/** 6.1 交易列表查询 */
export interface TransactionQuery {
  page?: number;
  pageSize?: number;
  begin?: string;
  end?: string;
  categoryId?: number;
  accountId?: number;
  direction?: Direction;
  keyword?: string;
}

/** 6.3 修改分类结果 */
export interface UpdateCategoryResult {
  txnId: number;
  categoryId: number;
  ruleUpdated: boolean;
}
