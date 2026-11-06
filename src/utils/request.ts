import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';
import type { ApiResponse } from '@/types/common';
import { clearAuth, getToken } from './auth';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const rawRequest = axios.create({
  baseURL,
  timeout: 20000,
});

function redirectToLogin(): void {
  clearAuth();
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

rawRequest.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.token = token;
  }
  return config;
});

rawRequest.interceptors.response.use(
  (response: AxiosResponse) => {
    // 文件下载直接返回完整响应，便于读取 Content-Disposition
    if (response.config.responseType === 'blob') {
      return response;
    }
    const body = response.data as ApiResponse<unknown>;
    if (!body || typeof body !== 'object' || !('code' in body)) {
      return response.data;
    }
    if (body.code !== 1) {
      if (body.code === 401) {
        message.error(body.msg || '登录已失效，请重新登录');
        redirectToLogin();
      } else {
        message.error(body.msg || '请求失败');
      }
      return Promise.reject(new Error(body.msg || '请求失败'));
    }
    return body.data;
  },
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      message.error(error.response?.data?.msg || '登录已失效，请重新登录');
      redirectToLogin();
    } else {
      const msg = error.response?.data?.msg || error.message || '网络异常，请稍后重试';
      message.error(msg);
    }
    return Promise.reject(error);
  },
);

/** 业务请求封装，泛型 T 为 data 类型（响应拦截器已解包 data） */
export const http = {
  get<T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
    return rawRequest.get(url, { params, ...config }) as unknown as Promise<T>;
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return rawRequest.post(url, data, config) as unknown as Promise<T>;
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return rawRequest.put(url, data, config) as unknown as Promise<T>;
  },
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return rawRequest.patch(url, data, config) as unknown as Promise<T>;
  },
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return rawRequest.delete(url, config) as unknown as Promise<T>;
  },
};
