export interface UserInfo {
  id: number;
  username: string;
  name: string;
}

export interface LoginParams {
  username: string;
  password: string;
}

/** 1.1 登录响应 */
export interface LoginResult {
  id: number;
  username: string;
  name: string;
  token: string;
}
