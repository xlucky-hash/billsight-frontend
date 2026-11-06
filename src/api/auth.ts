import type { LoginParams, LoginResult } from '@/types/auth';
import { http } from '@/utils/request';

/** 1.1 登录 */
export function login(data: LoginParams): Promise<LoginResult> {
  return http.post<LoginResult>('/auth/login', data);
}
