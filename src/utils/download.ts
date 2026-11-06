import type { AxiosResponse } from 'axios';
import { rawRequest } from './request';

function parseFileName(disposition?: string): string | undefined {
  if (!disposition) return undefined;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1];
}

/** 通过 axios blob 下载文件，自动读取 Content-Disposition 文件名 */
export async function downloadFile(
  url: string,
  params?: Record<string, unknown>,
  fallbackName = '账单报表.xlsx',
): Promise<void> {
  const response = await rawRequest.get<Blob, AxiosResponse<Blob>>(url, {
    params,
    responseType: 'blob',
  });
  const filename =
    parseFileName(response.headers['content-disposition'] as string | undefined) ?? fallbackName;
  const blob = new Blob([response.data]);
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}
