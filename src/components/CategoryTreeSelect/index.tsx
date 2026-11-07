import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { TreeSelect } from 'antd';
import { listCategories } from '@/api/categories';
import type { Category } from '@/types/category';
import type { Direction } from '@/types/transaction';

export interface CategoryTreeNode {
  value: number;
  title: string;
  children?: CategoryTreeNode[];
}

let listCache: Category[] | null = null;
let listRequest: Promise<Category[]> | null = null;

function loadCategories(): Promise<Category[]> {
  if (listCache) return Promise.resolve(listCache);
  if (!listRequest) {
    listRequest = listCategories()
      .then((data) => {
        listCache = data;
        return data;
      })
      .catch((error) => {
        listRequest = null;
        throw error;
      });
  }
  return listRequest;
}

/** 平铺列表按 parentId 组树，direction 过滤时 BOTH 也算可选 */
function buildTree(list: Category[], direction?: Direction): CategoryTreeNode[] {
  const matched = list.filter(
    (item) => !direction || item.direction === direction || item.direction === 'BOTH',
  );
  const childrenMap = new Map<number | null, Category[]>();
  matched.forEach((item) => {
    const key = item.parentId;
    const group = childrenMap.get(key) ?? [];
    group.push(item);
    childrenMap.set(key, group);
  });
  const toNode = (item: Category): CategoryTreeNode => {
    const children = (childrenMap.get(item.id) ?? []).map(toNode);
    return {
      value: item.id,
      title: item.name,
      children: children.length ? children : undefined,
    };
  };
  return (childrenMap.get(null) ?? []).map(toNode);
}

interface CategoryTreeSelectProps {
  value?: number | null;
  onChange?: (value: number | undefined) => void;
  direction?: Direction;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
}

/** 分类树选择器：direction 过滤，可搜索，任意层级可选 */
export default function CategoryTreeSelect({
  value,
  onChange,
  direction,
  placeholder = '请选择分类',
  allowClear = true,
  disabled,
  style,
}: CategoryTreeSelectProps) {
  const [list, setList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadCategories()
      .then((data) => {
        if (alive) setList(data);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <TreeSelect
      value={value ?? undefined}
      onChange={(next) => onChange?.(next as number | undefined)}
      treeData={buildTree(list, direction)}
      loading={loading}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabled}
      showSearch
      treeNodeFilterProp="title"
      treeDefaultExpandAll
      style={{ width: '100%', ...style }}
    />
  );
}
