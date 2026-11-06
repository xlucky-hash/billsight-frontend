import type { ReportQuery, ReportSummary } from '@/types/report';
import { http } from '@/utils/request';
import { downloadFile } from '@/utils/download';

/** 8.1 月度报表 */
export function getReportSummary(params: ReportQuery): Promise<ReportSummary> {
  return http.get<ReportSummary>('/reports/monthly', params as unknown as Record<string, unknown>);
}

/** 8.2 导出月度报表 */
export function exportReport(
  params: ReportQuery,
  fallbackName = '账单报表.xlsx',
): Promise<void> {
  return downloadFile(
    '/reports/monthly/export',
    params as unknown as Record<string, unknown>,
    fallbackName,
  );
}
