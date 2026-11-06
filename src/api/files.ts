import type { UploadResult } from '@/types/file';
import { http } from '@/utils/request';

/**
 * 2.1 文件上传（multipart，仅 file）
 * 后端按后缀名路由到 OCR / CSV / Excel 解析器，并立即返回 batchId
 */
export function uploadFile(file: File, accountId?: number): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (accountId) {
    formData.append('accountId', String(accountId));
  }
  return http.post<UploadResult>('/files/upload', formData);
}
