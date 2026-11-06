/** 统一响应结构 */
export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

/** 统一分页响应 */
export interface PageResult<T> {
  total: number;
  rows: T[];
}

/** 通用分页查询参数 */
export interface PageQuery {
  page?: number;
  pageSize?: number;
}
