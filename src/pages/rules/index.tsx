import { DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, Input, Popconfirm, Space, Table, Tabs, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { deleteRule, listCorrections, listRules } from '@/api/rules';
import type { Correction, Rule } from '@/types/rule';
import { CLASSIFY_SOURCE_META } from '@/utils/constants';
import { formatDateTime } from '@/utils/format';

const ruleColumns: ColumnsType<Rule> = [
  { title: '特征', dataIndex: 'feature' },
  {
    title: '匹配分类',
    dataIndex: 'categoryName',
    render: (value: string) => value || '-',
  },
  { title: '命中次数', dataIndex: 'hitCount', width: 100, align: 'right' },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    width: 160,
    render: (value: string) => formatDateTime(value),
  },
];

const correctionColumns: ColumnsType<Correction> = [
  { title: '交易 ID', dataIndex: 'txnId', width: 110 },
  { title: '特征', dataIndex: 'feature' },
  {
    title: '原分类',
    dataIndex: 'fromCategoryName',
    width: 130,
    render: (value: string) => value || '未分类',
  },
  { title: '新分类', dataIndex: 'toCategoryName', width: 130 },
  {
    title: '原来源',
    dataIndex: 'fromSource',
    width: 110,
    render: (value: Correction['fromSource']) => (
      <Tag color={CLASSIFY_SOURCE_META[value].color}>{CLASSIFY_SOURCE_META[value].label}</Tag>
    ),
  },
  {
    title: '修正时间',
    dataIndex: 'createdAt',
    width: 160,
    render: (value: string) => formatDateTime(value),
  },
];

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState('rules');
  const [rules, setRules] = useState<Rule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [correctionsLoading, setCorrectionsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadRules = async () => {
    setRulesLoading(true);
    try {
      const data = await listRules();
      setRules(data);
    } catch {
      setRules([]);
    } finally {
      setRulesLoading(false);
    }
  };

  const loadCorrections = async (current = page, size = pageSize) => {
    setCorrectionsLoading(true);
    try {
      const result = await listCorrections({ page: current, pageSize: size });
      setCorrections(result.rows);
      setTotal(result.total);
    } catch {
      setCorrections([]);
      setTotal(0);
    } finally {
      setCorrectionsLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  useEffect(() => {
    if (activeTab === 'corrections') {
      loadCorrections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, pageSize]);

  const filteredRules = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rules;
    return rules.filter(
      (rule) =>
        rule.feature.toLowerCase().includes(keyword) ||
        (rule.categoryName ?? '').toLowerCase().includes(keyword),
    );
  }, [rules, search]);

  const handleDelete = async (id: number) => {
    try {
      await deleteRule(id);
      message.success('规则已删除');
      loadRules();
    } catch {
      // 错误提示由请求拦截器统一处理
    }
  };

  const rulesTable = (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Input
        prefix={<SearchOutlined />}
        placeholder="搜索关键词或分类"
        value={search}
        allowClear
        onChange={(event) => setSearch(event.target.value)}
        style={{ maxWidth: 280 }}
      />
      <Table<Rule>
        rowKey="id"
        columns={[
          ...ruleColumns,
          {
            title: '操作',
            key: 'action',
            width: 100,
            render: (_value, record) => (
              <Popconfirm
                title="确定删除该规则？"
                okText="删除"
                cancelText="取消"
                onConfirm={() => handleDelete(record.id)}
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            ),
          },
        ]}
        dataSource={filteredRules}
        loading={rulesLoading}
        pagination={false}
        locale={{ emptyText: '暂无用户规则' }}
      />
    </Space>
  );

  const correctionsTable = (
    <Table<Correction>
      rowKey="id"
      columns={correctionColumns}
      dataSource={corrections}
      loading={correctionsLoading}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (count) => `共 ${count} 条`,
        onChange: (nextPage, nextSize) => {
          setPage(nextPage);
          setPageSize(nextSize);
        },
      }}
      locale={{ emptyText: '暂无修正记录' }}
    />
  );

  return (
    <Card bordered={false}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'rules', label: '用户规则', children: rulesTable },
          { key: 'corrections', label: '修正历史', children: correctionsTable },
        ]}
      />
    </Card>
  );
}
