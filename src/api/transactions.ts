import type { PageResult } from '@/types/common';
import type { Transaction, TransactionQuery, UpdateCategoryResult } from '@/types/transaction';
import { http } from '@/utils/request';

/** 6.1 交易列表 */
export function listTransactions(params: TransactionQuery): Promise<PageResult<Transaction>> {
  return http.get<PageResult<Transaction>>('/transactions', params as Record<string, unknown>);
}

/** 6.2 交易详情 */
export function getTransactionDetail(id: number): Promise<Transaction> {
  return http.get<Transaction>(`/transactions/${id}`);
}

/** 6.3 修改交易分类 */
export function updateTransactionCategory(
  id: number,
  newCategoryId: number,
): Promise<UpdateCategoryResult> {
  return http.patch<UpdateCategoryResult>(`/transactions/${id}/category`, { newCategoryId });
}
