export type SourceType = 'OCR' | 'CSV' | 'EXCEL';

export type BatchStatus = 'PARSING' | 'PENDING_REVIEW' | 'CONFIRMED' | 'FAILED';

/** 5.5 批次列表行 */
export interface ImportBatch {
  batchId: string;
  sourceType: SourceType;
  status: BatchStatus;
  totalCount?: number;
  successCount?: number;
  failReason?: string | null;
  createdAt: string;
}

/** 2.2 轮询结论：上传后每秒调用一次，直到 PENDING_REVIEW */
export interface BatchDetail {
  batchId: string;
  status: BatchStatus;
  totalCount?: number;
  failReason?: string | null;
}

/** 5.3 待校对记录 */
export interface ImportRecord {
  txnId: number;
  txnTime: string;
  amount: number;
  counterparty: string;
  summary: string;
  systemCategoryId: number | null;
  systemCategoryName: string;
  classifySource: 'RULE' | 'NB' | 'LLM';
  confidence: number;
  status: 'PENDING_REVIEW';
}

/** 5.5 批次列表查询 */
export interface BatchQuery {
  page?: number;
  pageSize?: number;
  status?: BatchStatus;
}

/** 5.4 确认入库参数 */
export interface ConfirmParams {
  confirmAll: boolean;
  corrections?: Array<{ txnId: number; newCategoryId: number }>;
}

/** 5.4 确认入库结果 */
export interface ConfirmResult {
  confirmed: number;
  corrected: number;
  rulesUpdated: number;
}
