import type { PageResult } from '@/types/common';
import type {
  BatchDetail,
  BatchQuery,
  ConfirmParams,
  ConfirmResult,
  ImportBatch,
  ImportRecord,
} from '@/types/importBatch';
import { http } from '@/utils/request';

/** 2.2 批次解析进度（轮询，每秒一次） */
export function getBatchDetail(batchId: string): Promise<BatchDetail> {
  return http.get<BatchDetail>(`/import-batches/${batchId}`);
}

/** 5.3 待校对记录（数组） */
export function getBatchRecords(batchId: string): Promise<ImportRecord[]> {
  return http.get<ImportRecord[]>(`/import-batches/${batchId}/records`);
}

/** 5.4 确认入库 */
export function confirmBatch(batchId: string, data: ConfirmParams): Promise<ConfirmResult> {
  return http.post<ConfirmResult>(`/import-batches/${batchId}/confirm`, data);
}

/** 5.5 导入历史列表 */
export function listBatches(params: BatchQuery): Promise<PageResult<ImportBatch>> {
  return http.get<PageResult<ImportBatch>>('/import-batches', params as Record<string, unknown>);
}

/** 5.6 失败重试 */
export function retryBatch(batchId: string): Promise<BatchDetail> {
  return http.post<BatchDetail>(`/import-batches/${batchId}/retry`);
}
