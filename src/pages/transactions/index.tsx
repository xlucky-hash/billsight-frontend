import { EditOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { getTransactionDetail, listTransactions, updateTransactionCategory } from '@/api/transactions';
import AccountSelect from '@/components/AccountSelect';
import AmountText from '@/components/AmountText';
import CategoryTreeSelect from '@/components/CategoryTreeSelect';
import DirectionSelect from '@/components/DirectionSelect';
import type { Transaction } from '@/types/transaction';
import type { Direction } from '@/types/transaction';
import { CLASSIFY_SOURCE_META, DIRECTION_META } from '@/utils/constants';
import { formatDateTime, formatPercent } from '@/utils/format';

interface FilterState {
  range: [Dayjs | null, Dayjs | null] | null;
  categoryId?: number;
  accountId?: number;
  direction?: Direction;
  keyword: string;
}

const EMPTY_FILTERS: FilterState = {
  range: null,
  categoryId: undefined,
  accountId: undefined,
  direction: undefined,
  keyword: '',
};

export default function TransactionsPage() {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [query, setQuery] = useState<FilterState & { page: number; pageSize: number }>({
    ...EMPTY_FILTERS,
    page: 1,
    pageSize: 10,
  });
  const [rows, setRows] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftCategoryId, setDraftCategoryId] = useState<number | undefined>();
  const [savingId, setSavingId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listTransactions({
        page: query.page,
        pageSize: query.pageSize,
        begin: query.range?.[0]?.format('YYYY-MM-DD'),
        end: query.range?.[1]?.format('YYYY-MM-DD'),
        categoryId: query.categoryId,
        accountId: query.accountId,
        direction: query.direction,
        keyword: query.keyword.trim() || undefined,
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch {
      setRows([]);
      setTotal(0);
      setError('交易列表加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    setQuery({ ...filters, page: 1, pageSize: query.pageSize });
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setQuery({ ...EMPTY_FILTERS, page: 1, pageSize: query.pageSize });
  };

  const handleSaveCategory = async (record: Transaction) => {
    if (!draftCategoryId) {
      message.warning('请先选择分类');
      return;
    }
    if (draftCategoryId === record.categoryId) {
      setEditingId(null);
      return;
    }
    setSavingId(record.id);
    try {
      const result = await updateTransactionCategory(record.id, draftCategoryId);
      message.success(result.ruleUpdated ? '分类已更新，并已反哺规则' : '分类已更新');
      setEditingId(null);
      load();
    } catch {
      // 失败时保持原行数据，实现回滚
      message.error('分类更新失败，已回滚');
    } finally {
      setSavingId(null);
    }
  };

  const openDetail = async (id: number) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await getTransactionDetail(id);
      setDetail(data);
    } catch {
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: ColumnsType<Transaction> = [
    {
      title: '交易时间',
      dataIndex: 'txnTime',
      width: 150,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '账户',
      dataIndex: 'accountName',
      width: 140,
      render: (value: string) => value || '-',
    },
    {
      title: '对方 / 摘要',
      dataIndex: 'counterparty',
      render: (_value: string, record) => (
        <div>
          <div>{record.counterparty || '-'}</div>
          {record.summary ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.summary}
            </Typography.Text>
          ) : null}
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      width: 220,
      render: (_value: string, record) => {
        if (editingId === record.id) {
          return (
            <CategoryTreeSelect
              value={draftCategoryId}
              direction={record.direction}
              onChange={setDraftCategoryId}
              placeholder="选择分类"
              style={{ width: 190 }}
            />
          );
        }
        return record.categoryName || <Typography.Text type="secondary">未分类</Typography.Text>;
      },
    },
    {
      title: '收支',
      dataIndex: 'direction',
      width: 80,
      render: (value: Direction) => (
        <Tag color={DIRECTION_META[value].color}>{DIRECTION_META[value].label}</Tag>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 140,
      align: 'right',
      render: (value: number, record) => (
        <AmountText value={value} direction={record.direction} />
      ),
    },
    {
      title: '分类来源',
      dataIndex: 'classifySource',
      width: 110,
      render: (value: Transaction['classifySource']) => (
        <Tag color={CLASSIFY_SOURCE_META[value].color}>{CLASSIFY_SOURCE_META[value].label}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_value, record) => {
        if (editingId === record.id) {
          return (
            <Space size={4}>
              <Button
                type="link"
                size="small"
                loading={savingId === record.id}
                onClick={() => handleSaveCategory(record)}
              >
                保存
              </Button>
              <Button type="link" size="small" onClick={() => setEditingId(null)}>
                取消
              </Button>
            </Space>
          );
        }
        return (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingId(record.id);
                setDraftCategoryId(record.categoryId ?? undefined);
              }}
            >
              编辑
            </Button>
            <Button type="link" size="small" onClick={() => openDetail(record.id)}>
              详情
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false}>
        <Space wrap size={12}>
          <DatePicker.RangePicker
            value={filters.range}
            onChange={(dates) =>
              setFilters((prev) => ({
                ...prev,
                range: dates as [Dayjs | null, Dayjs | null] | null,
              }))
            }
          />
          <CategoryTreeSelect
            value={filters.categoryId}
            onChange={(value) => setFilters((prev) => ({ ...prev, categoryId: value }))}
            placeholder="全部分类"
            style={{ width: 180 }}
          />
          <AccountSelect
            value={filters.accountId}
            onChange={(value) => setFilters((prev) => ({ ...prev, accountId: value }))}
            allowClear
            style={{ width: 180 }}
          />
          <DirectionSelect
            value={filters.direction}
            onChange={(value) => setFilters((prev) => ({ ...prev, direction: value }))}
            style={{ width: 130 }}
          />
          <Input.Search
            value={filters.keyword}
            onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value }))}
            placeholder="商户 / 说明 / 分类"
            allowClear
            style={{ width: 220 }}
            onSearch={handleSearch}
          />
          <Button type="primary" onClick={handleSearch}>
            查询
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <Card bordered={false}>
        <Table<Transaction>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          scroll={{ x: 1180 }}
          rowClassName={(record) =>
            editingId === record.id ? '' : 'clickable-row'
          }
          onRow={(record) => ({
            onClick: (event) => {
              if (editingId === record.id) return;
              const target = event.target as HTMLElement;
              if (target.closest('button') || target.closest('.ant-select')) return;
              openDetail(record.id);
            },
          })}
          pagination={{
            current: query.page,
            pageSize: query.pageSize,
            total,
            showSizeChanger: true,
            showTotal: (count) => `共 ${count} 条`,
            onChange: (page, pageSize) => setQuery((prev) => ({ ...prev, page, pageSize })),
          }}
          locale={{ emptyText: '暂无交易数据' }}
        />
      </Card>

      <Modal
        title="交易详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={620}
        destroyOnClose
      >
        {detail ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="交易时间">{formatDateTime(detail.txnTime)}</Descriptions.Item>
            <Descriptions.Item label="账户">{detail.accountName || '-'}</Descriptions.Item>
            <Descriptions.Item label="对方">{detail.counterparty || '-'}</Descriptions.Item>
            <Descriptions.Item label="摘要">{detail.summary || '-'}</Descriptions.Item>
            <Descriptions.Item label="分类">{detail.categoryName || '未分类'}</Descriptions.Item>
            <Descriptions.Item label="收支方向">
              <Tag color={DIRECTION_META[detail.direction].color}>
                {DIRECTION_META[detail.direction].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="金额">
              <AmountText value={detail.amount} direction={detail.direction} />
            </Descriptions.Item>
            <Descriptions.Item label="分类来源">
              {CLASSIFY_SOURCE_META[detail.classifySource].label}
            </Descriptions.Item>
            <Descriptions.Item label="置信度">{formatPercent(detail.confidence)}</Descriptions.Item>
            <Descriptions.Item label="关联批次">{detail.batchId ?? '-'}</Descriptions.Item>
          </Descriptions>
        ) : (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            {detailLoading ? '加载中...' : '暂无数据'}
          </div>
        )}
      </Modal>
    </Space>
  );
}
