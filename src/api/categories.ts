import type { Category } from '@/types/category';
import type { Direction } from '@/types/transaction';
import { http } from '@/utils/request';

/** 4.1 分类列表（平铺，含 parentId，前端按 parentId 组树） */
export function listCategories(direction?: Direction): Promise<Category[]> {
  return http.get<Category[]>('/categories', direction ? { direction } : undefined);
}
