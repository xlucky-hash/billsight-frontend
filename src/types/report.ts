/** 8.1 分类聚合项（一级分类） */
export interface CategoryAmount {
  categoryId: number;
  name: string;
  amount: number;
  ratio: number;
}

export interface TrendPoint {
  month: string;
  income: number;
  expense: number;
}

/** 8.1 月度报表 */
export interface ReportSummary {
  incomeTotal: number;
  expenseTotal: number;
  expenseByCategory: CategoryAmount[];
  incomeByCategory: CategoryAmount[];
  monthlyTrend: TrendPoint[];
}

/** 8.1 查询参数 */
export interface ReportQuery {
  year: number;
  month: number;
  accountId?: number;
}
