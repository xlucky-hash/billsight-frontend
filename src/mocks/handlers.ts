import dayjs from 'dayjs';
import { delay, http, HttpResponse } from 'msw';
import type { Account, AccountPayload, AccountType } from '@/types/account';
import type { CategoryDirection } from '@/types/category';
import type {
  BatchDetail,
  ConfirmParams,
  ImportBatch,
  SourceType,
} from '@/types/importBatch';
import type { Direction, Transaction, TransactionQuery } from '@/types/transaction';
import type { PageResult } from '@/types/common';
import {
  ALL_CATEGORIES,
  CATEGORY_NAME_MAP,
  FIXED_TOKEN,
  MOCK_USER,
  accounts,
  batches,
  categoryIdsOf,
  corrections,
  createReviewItems,
  nextBatchSeq,
  nextCorrectionSeq,
  nextReviewTxnId,
  reviewItemsByBatch,
  rules,
  setBatches,
  setCorrections,
  setRules,
  transactions,
} from './data';
import type { BatchStore } from './data';

function ok<T>(data: T, msg = 'success') {
  return HttpResponse.json({ code: 1, msg, data });
}

function fail(msg: string, code = 0) {
  return HttpResponse.json({ code, msg, data: null });
}

function unauthorized() {
  return HttpResponse.json(
    { code: 401, msg: '登录状态已失效，请重新登录', data: null },
    { status: 401 },
  );
}

function checkAuth(request: Request) {
  const token = request.headers.get('token');
  return token === FIXED_TOKEN ? null : unauthorized();
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function paginate<T>(items: T[], page = 1, pageSize = 10): PageResult<T> {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safeSize;
  return { total: items.length, rows: items.slice(start, start + safeSize) };
}

const pollCounts: Record<string, number> = {};

/** 后端按文件后缀名自动判定解析器 */
function inferSourceType(fileName: string): SourceType {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff'].includes(ext)) return 'OCR';
  if (ext === 'xlsx' || ext === 'xls') return 'EXCEL';
  return 'CSV';
}

/** 批次对外状态详情（仅契约字段） */
function toBatchDetail(batch: BatchStore): BatchDetail {
  return {
    batchId: batch.batchId,
    status: batch.status,
    totalCount: batch.totalCount,
    failReason: batch.failReason ?? undefined,
  };
}

/** 批次列表行（仅契约字段） */
function toBatchRow(batch: BatchStore): ImportBatch {
  return {
    batchId: batch.batchId,
    sourceType: batch.sourceType,
    status: batch.status,
    totalCount: batch.totalCount,
    successCount: batch.successCount,
    failReason: batch.failReason ?? undefined,
    createdAt: batch.createdAt,
  };
}

function ensureReviewItems(batch: BatchStore) {
  if (!reviewItemsByBatch[batch.batchId]) {
    reviewItemsByBatch[batch.batchId] = createReviewItems(nextReviewTxnId());
  }
  const items = reviewItemsByBatch[batch.batchId];
  batch.totalCount = items.length;
  return items;
}

function monthTransactions(year: number, month: number, accountId?: number): Transaction[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return transactions.filter((item) => {
    if (!item.txnTime.startsWith(prefix)) return false;
    if (accountId && item.accountId !== accountId) return false;
    return true;
  });
}

/** 报表分类聚合：二级分类保留自身，直接向一级（方向根节点）上卷 */
function resolveReportCategory(categoryId: number | null): { id: number; name: string } {
  if (categoryId === null) return { id: 0, name: '未分类' };
  const category = ALL_CATEGORIES.find((item) => item.id === categoryId);
  if (!category) return { id: 0, name: '未分类' };
  if (category.parentId === null) return { id: category.id, name: category.name };
  return { id: category.id, name: category.name };
}

function buildCategoryAgg(items: Transaction[], direction: Direction) {
  const grouped = new Map<number, { id: number; name: string; amount: number }>();
  items
    .filter((item) => item.direction === direction)
    .forEach((item) => {
      const target = resolveReportCategory(item.categoryId);
      const prev = grouped.get(target.id);
      if (prev) {
        prev.amount += item.amount;
      } else {
        grouped.set(target.id, { id: target.id, name: target.name, amount: item.amount });
      }
    });
  const total = Array.from(grouped.values()).reduce((sum, item) => sum + item.amount, 0);
  return Array.from(grouped.values())
    .map((item) => ({
      categoryId: item.id,
      name: item.name,
      amount: round2(item.amount),
      ratio: total > 0 ? round2(item.amount / total) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { username?: string; password?: string };
    if (!body.username || !body.password) {
      return fail('请输入用户名和密码');
    }
    if (body.username !== MOCK_USER.username || body.password !== '123456') {
      return fail('用户名或密码错误');
    }
    return ok({
      id: MOCK_USER.id,
      username: MOCK_USER.username,
      name: MOCK_USER.name,
      token: FIXED_TOKEN,
    });
  }),

  http.post('/api/files/upload', async ({ request }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(500);
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return fail('未获取到上传文件');
    }
    const accountIdRaw = formData.get('accountId');
    const accountId = accountIdRaw ? Number(accountIdRaw) : undefined;
    const batchId = nextBatchSeq();
    const batch: BatchStore = {
      batchId,
      sourceType: inferSourceType(file.name),
      status: 'PARSING',
      totalCount: 0,
      successCount: 0,
      failReason: null,
      createdAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
      accountId,
      objectKey: `${MOCK_USER.id}/${dayjs().format('YYYYMM')}/${Date.now()}-${file.name}`,
    };
    batches.unshift(batch);
    pollCounts[batchId] = 0;
    return ok({ batchId }, '文件已接收，正在后台解析中');
  }),

  http.get('/api/accounts', async ({ request }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(200);
    return ok(accounts);
  }),

  http.post('/api/accounts', async ({ request }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(300);
    const body = (await request.json()) as { name?: string; type?: AccountType };
    if (!body.name || !body.type) {
      return fail('账户名称与类型不能为空');
    }
    const account: Account = {
      id: Math.max(0, ...accounts.map((item) => item.id)) + 1,
      name: body.name,
      type: body.type,
      balance: null,
      createTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    };
    accounts.push(account);
    return ok(null, '账户创建成功');
  }),

  http.put('/api/accounts', async ({ request }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(300);
    const body = (await request.json()) as AccountPayload;
    const target = accounts.find((item) => item.id === Number(body.id));
    if (!target) return fail('账户不存在');
    if (body.name) target.name = body.name;
    if (body.type) target.type = body.type;
    return ok(null, '账户已更新');
  }),

  http.delete('/api/accounts/:id', async ({ request, params }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(300);
    const id = Number(params.id);
    const index = accounts.findIndex((item) => item.id === id);
    if (index < 0) return fail('账户不存在');
    accounts.splice(index, 1);
    return ok(null, '账户已删除');
  }),

  http.get('/api/categories', async ({ request }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(200);
    const direction = new URL(request.url).searchParams.get('direction') as
      | CategoryDirection
      | null;
    const list = direction
      ? ALL_CATEGORIES.filter(
          (item) => item.direction === direction || item.direction === 'BOTH',
        )
      : ALL_CATEGORIES;
    return ok(list);
  }),

  http.get('/api/import-batches/:batchId', async ({ request, params }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(150);
    const batchId = String(params.batchId);
    const batch = batches.find((item) => item.batchId === batchId);
    if (!batch) return fail('批次不存在', 404);
    if (batch.status === 'PARSING') {
      pollCounts[batchId] = (pollCounts[batchId] ?? 0) + 1;
      if (pollCounts[batchId] >= 2) {
        batch.status = 'PENDING_REVIEW';
        ensureReviewItems(batch);
      }
    }
    return ok(toBatchDetail(batch));
  }),

  http.get('/api/import-batches/:batchId/records', async ({ request, params }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(200);
    const batchId = String(params.batchId);
    const batch = batches.find((item) => item.batchId === batchId);
    if (!batch) return fail('批次不存在', 404);
    const items = ensureReviewItems(batch);
    return ok(items);
  }),

  http.post('/api/import-batches/:batchId/confirm', async ({ request, params }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(400);
    const batchId = String(params.batchId);
    const batch = batches.find((item) => item.batchId === batchId);
    if (!batch) return fail('批次不存在', 404);
    const body = (await request.json()) as ConfirmParams;
    const items = ensureReviewItems(batch);
    const correctionList = body.corrections ?? [];
    const correctionMap = new Map(correctionList.map((item) => [item.txnId, item.newCategoryId]));
    const account = accounts.find((item) => item.id === batch.accountId) ?? accounts[0];

    items.forEach((item) => {
      const corrected = correctionMap.has(item.txnId);
      const categoryId = correctionMap.get(item.txnId) ?? item.systemCategoryId;
      const categoryName = categoryId ? CATEGORY_NAME_MAP[categoryId] ?? '未分类' : '未分类';
      if (corrected) {
        corrections.unshift({
          id: nextCorrectionSeq(),
          txnId: item.txnId,
          feature: item.counterparty,
          fromCategoryName: item.systemCategoryName,
          toCategoryName: categoryName,
          fromSource: item.classifySource,
          createdAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
        });
      }
      transactions.unshift({
        id: item.txnId,
        batchId: batch.batchId,
        accountId: account.id,
        accountName: account.name,
        categoryId,
        categoryName,
        txnTime: item.txnTime,
        amount: item.amount,
        direction: 'EXPENSE',
        counterparty: item.counterparty,
        summary: item.summary,
        confidence: 1,
        classifySource: corrected ? 'MANUAL' : item.classifySource,
      });
    });

    batch.status = 'CONFIRMED';
    batch.successCount = items.length;
    batch.totalCount = items.length;
    batch.failReason = null;
    setBatches([...batches]);
    setCorrections([...corrections]);

    const correctedCount = correctionList.length;
    return ok(
      {
        confirmed: items.length,
        corrected: correctedCount,
        rulesUpdated: correctedCount > 0 ? correctedCount : 0,
      },
      '确认入库成功',
    );
  }),

  http.get('/api/import-batches', async ({ request }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(250);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 10);
    const status = url.searchParams.get('status');
    let list = [...batches].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (status) {
      list = list.filter((item) => item.status === status);
    }
    return ok(paginate(list.map(toBatchRow), page, pageSize));
  }),

  http.post('/api/import-batches/:batchId/retry', async ({ request, params }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(300);
    const batchId = String(params.batchId);
    const batch = batches.find((item) => item.batchId === batchId);
    if (!batch) return fail('批次不存在', 404);
    batch.status = 'PARSING';
    batch.failReason = null;
    batch.totalCount = 0;
    batch.successCount = 0;
    pollCounts[batchId] = 0;
    delete reviewItemsByBatch[batchId];
    return ok(toBatchDetail(batch), '已重新提交解析');
  }),

  http.get('/api/transactions', async ({ request }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(300);
    const url = new URL(request.url);
    const query: TransactionQuery = {
      page: Number(url.searchParams.get('page') ?? 1),
      pageSize: Number(url.searchParams.get('pageSize') ?? 10),
      begin: url.searchParams.get('begin') ?? undefined,
      end: url.searchParams.get('end') ?? undefined,
      categoryId: url.searchParams.get('categoryId')
        ? Number(url.searchParams.get('categoryId'))
        : undefined,
      accountId: url.searchParams.get('accountId')
        ? Number(url.searchParams.get('accountId'))
        : undefined,
      direction: (url.searchParams.get('direction') as TransactionQuery['direction']) ?? undefined,
      keyword: url.searchParams.get('keyword') ?? undefined,
    };
    let list = [...transactions].sort((a, b) => (a.txnTime < b.txnTime ? 1 : -1));
    if (query.begin) {
      list = list.filter((item) => item.txnTime.slice(0, 10) >= query.begin!);
    }
    if (query.end) {
      list = list.filter((item) => item.txnTime.slice(0, 10) <= query.end!);
    }
    if (query.categoryId) {
      const ids = categoryIdsOf(query.categoryId);
      list = list.filter((item) => item.categoryId !== null && ids.includes(item.categoryId));
    }
    if (query.accountId) {
      list = list.filter((item) => item.accountId === query.accountId);
    }
    if (query.direction) {
      list = list.filter((item) => item.direction === query.direction);
    }
    if (query.keyword) {
      const keyword = query.keyword.toLowerCase();
      list = list.filter((item) =>
        [item.counterparty, item.summary, item.categoryName, item.accountName]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(keyword)),
      );
    }
    return ok(paginate(list, query.page, query.pageSize));
  }),

  http.get('/api/transactions/:id', async ({ request, params }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(200);
    const id = Number(params.id);
    const target = transactions.find((item) => item.id === id);
    if (!target) return fail('交易不存在', 404);
    return ok(target);
  }),

  http.patch('/api/transactions/:id/category', async ({ request, params }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(300);
    const id = Number(params.id);
    const target = transactions.find((item) => item.id === id);
    if (!target) return fail('交易不存在', 404);
    const body = (await request.json()) as { newCategoryId?: number };
    if (!body.newCategoryId) return fail('请选择分类');
    const fromCategoryName = target.categoryName ?? '未分类';
    const fromSource =
      target.classifySource === 'MANUAL' ? 'RULE' : (target.classifySource as 'RULE' | 'NB' | 'LLM');
    target.categoryId = body.newCategoryId;
    target.categoryName = CATEGORY_NAME_MAP[body.newCategoryId] ?? '未分类';
    target.classifySource = 'MANUAL';
    target.confidence = 1;
    corrections.unshift({
      id: nextCorrectionSeq(),
      txnId: target.id,
      feature: target.counterparty,
      fromCategoryName,
      toCategoryName: target.categoryName,
      fromSource,
      createdAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    });
    setCorrections([...corrections]);
    const ruleUpdated = Boolean(target.counterparty);
    return ok({ txnId: target.id, categoryId: target.categoryId, ruleUpdated }, '交易分类已更新');
  }),

  http.get('/api/user-rules', async ({ request }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(250);
    return ok(rules);
  }),

  http.delete('/api/user-rules/:id', async ({ request, params }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(300);
    const id = Number(params.id);
    const next = rules.filter((item) => item.id !== id);
    setRules(next);
    return ok(null, '规则已删除');
  }),

  http.get('/api/corrections', async ({ request }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(250);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 10);
    const list = [...corrections].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return ok(paginate(list, page, pageSize));
  }),

  http.get('/api/reports/monthly', async ({ request }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(300);
    const url = new URL(request.url);
    const now = dayjs();
    const year = Number(url.searchParams.get('year') ?? now.year());
    const month = Number(url.searchParams.get('month') ?? now.month() + 1);
    const accountId = url.searchParams.get('accountId')
      ? Number(url.searchParams.get('accountId'))
      : undefined;
    const monthList = monthTransactions(year, month, accountId);
    const incomeTotal = round2(
      monthList.filter((item) => item.direction === 'INCOME').reduce((sum, item) => sum + item.amount, 0),
    );
    const expenseTotal = round2(
      monthList.filter((item) => item.direction === 'EXPENSE').reduce((sum, item) => sum + item.amount, 0),
    );
    const monthlyTrend = Array.from({ length: 6 }).map((_, index) => {
      const target = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).subtract(5 - index, 'month');
      const list = monthTransactions(target.year(), target.month() + 1, accountId);
      return {
        month: target.format('YYYY-MM'),
        income: round2(
          list.filter((item) => item.direction === 'INCOME').reduce((sum, item) => sum + item.amount, 0),
        ),
        expense: round2(
          list.filter((item) => item.direction === 'EXPENSE').reduce((sum, item) => sum + item.amount, 0),
        ),
      };
    });
    return ok({
      incomeTotal,
      expenseTotal,
      expenseByCategory: buildCategoryAgg(monthList, 'EXPENSE'),
      incomeByCategory: buildCategoryAgg(monthList, 'INCOME'),
      monthlyTrend,
    });
  }),

  http.get('/api/reports/monthly/export', async ({ request }) => {
    const deny = checkAuth(request);
    if (deny) return deny;
    await delay(400);
    const url = new URL(request.url);
    const now = dayjs();
    const year = Number(url.searchParams.get('year') ?? now.year());
    const month = Number(url.searchParams.get('month') ?? now.month() + 1);
    const accountId = url.searchParams.get('accountId')
      ? Number(url.searchParams.get('accountId'))
      : undefined;
    const list = monthTransactions(year, month, accountId);
    const rows = [
      ['交易时间', '账户', '对方', '摘要', '分类', '收支', '金额'],
      ...list.map((item) => [
        item.txnTime,
        item.accountName ?? '',
        item.counterparty ?? '',
        item.summary ?? '',
        item.categoryName ?? '未分类',
        item.direction === 'INCOME' ? '收入' : '支出',
        item.amount.toFixed(2),
      ]),
    ];
    const csv = `\uFEFF${rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')}`;
    const fileName = `report-${year}-${String(month).padStart(2, '0')}.csv`;
    return new HttpResponse(new Blob([csv], { type: 'text/csv;charset=utf-8' }), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  }),
];
