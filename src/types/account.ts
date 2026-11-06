export type AccountType = 'BANK' | 'ALIPAY' | 'WECHAT' | 'CASH';

/** 3.1 账户 */
export interface Account {
  id: number;
  name: string;
  type: AccountType;
  balance: number | null;
  createTime: string;
}

/** 3.2/3.3 新增、修改账户参数（修改时带 id） */
export interface AccountPayload {
  id?: number;
  name: string;
  type: AccountType;
}
