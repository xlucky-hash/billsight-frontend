/** 7.1 用户规则 */
export interface Rule {
  id: number;
  feature: string;
  categoryId: number;
  categoryName: string;
  hitCount: number;
  updatedAt: string;
}

/** 7.3 修正历史 */
export interface Correction {
  id: number;
  txnId: number;
  feature: string;
  fromCategoryName: string;
  toCategoryName: string;
  fromSource: 'RULE' | 'NB' | 'LLM';
  createdAt: string;
}
