import type { Direction } from './transaction';

/** 分类方向，BOTH 表示收支通用 */
export type CategoryDirection = Direction | 'BOTH';

/** 4.1 分类（平铺，parentId 为空表示一级分类） */
export interface Category {
  id: number;
  parentId: number | null;
  name: string;
  direction: CategoryDirection;
  icon?: string;
  sort?: number;
  builtin?: number;
}
