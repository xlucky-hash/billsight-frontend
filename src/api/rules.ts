import type { PageResult } from '@/types/common';
import type { Correction, Rule } from '@/types/rule';
import { http } from '@/utils/request';

/** 7.1 用户规则列表（数组） */
export function listRules(): Promise<Rule[]> {
  return http.get<Rule[]>('/user-rules');
}

/** 7.2 删除规则 */
export function deleteRule(id: number): Promise<null> {
  return http.delete<null>(`/user-rules/${id}`);
}

/** 7.3 修正历史列表 */
export function listCorrections(params: {
  page?: number;
  pageSize?: number;
}): Promise<PageResult<Correction>> {
  return http.get<PageResult<Correction>>('/corrections', params);
}
