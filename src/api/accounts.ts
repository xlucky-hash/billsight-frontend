import type { Account, AccountPayload } from '@/types/account';
import { http } from '@/utils/request';

/** 3.1 账户列表 */
export function listAccounts(): Promise<Account[]> {
  return http.get<Account[]>('/accounts');
}

/** 3.2 新增账户 */
export function createAccount(data: AccountPayload): Promise<null> {
  return http.post<null>('/accounts', { name: data.name, type: data.type });
}

/** 3.3 编辑账户（body 含 id、name、type） */
export function updateAccount(data: AccountPayload): Promise<null> {
  return http.put<null>('/accounts', { id: data.id, name: data.name, type: data.type });
}

/** 3.4 删除账户 */
export function deleteAccount(id: number): Promise<null> {
  return http.delete<null>(`/accounts/${id}`);
}
