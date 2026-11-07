import { DownloadOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Space,
  Statistic,
  Table,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAccounts } from '@/api/accounts';
import { exportReport, getReportSummary } from '@/api/reports';
import { listTransactions } from '@/api/transactions';
import AccountSelect from '@/components/AccountSelect';
import AmountText from '@/components/AmountText';
import FinanceCharts from '@/components/FinanceCharts';
import type { Account } from '@/types/account';
import type { ReportSummary } from '@/types/report';
import type { Transaction } from '@/types/transaction';
import { EXPENSE_COLOR, INCOME_COLOR } from '@/utils/constants';
import { formatDateTime } from '@/utils/format';

const recentColumns: ColumnsType<Transaction> = [
  {
    title: '交易时间',
    dataIndex: 'txnTime',
    width: 160,
    render: (value: string) => formatDateTime(value),
  },
  {
    title: '对方 / 摘要',
    dataIndex: 'counterparty',
    render: (_value: string, record) => record.counterparty || record.summary || '-',
  },
  {
    title: '分类',
    dataIndex: 'categoryName',
    render: (value: string) => value || '未分类',
  },
  {
    title: '账户',
    dataIndex: 'accountName',
    render: (value: string) => value || '-',
  },
  {
    title: '金额',
    dataIndex: 'amount',
    align: 'right',
    render: (value: number, record) => (
      <AmountText value={value} direction={record.direction} />
    ),
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [accountId, setAccountId] = useState<number | undefined>();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let alive = true;
    listAccounts()
      .then((data) => {
        if (alive) setAccounts(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setSummaryLoading(true);
    getReportSummary({ year: month.year(), month: month.month() + 1, accountId })
      .then((data) => {
        if (alive) setSummary(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setSummaryLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [month, accountId]);

  useEffect(() => {
    let alive = true;
    setRecentLoading(true);
    listTransactions({ page: 1, pageSize: 5, accountId })
      .then((data) => {
        if (alive) setRecent(data.rows);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setRecentLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [accountId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportReport(
        { year: month.year(), month: month.month() + 1, accountId },
        `账单报表-${month.format('YYYY-MM')}.xlsx`,
      );
      message.success('报表导出成功');
    } catch {
      // 错误提示由请求拦截器统一处理
    } finally {
      setExporting(false);
    }
  };

  const balance = (summary?.incomeTotal ?? 0) - (summary?.expenseTotal ?? 0);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false}>
        <Space wrap size={12}>
          <Typography.Text>统计月份</Typography.Text>
          <DatePicker
            picker="month"
            value={month}
            allowClear={false}
            onChange={(value) => value && setMonth(value)}
          />
          <AccountSelect allowAll value={accountId} onChange={setAccountId} />
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
            导出报表
          </Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="stat-card">
            <Statistic
              title="本月收入"
              value={summary?.incomeTotal ?? 0}
              precision={2}
              prefix="¥"
              loading={summaryLoading}
              valueStyle={{ color: INCOME_COLOR, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="stat-card">
            <Statistic
              title="本月支出"
              value={summary?.expenseTotal ?? 0}
              precision={2}
              prefix="¥"
              loading={summaryLoading}
              valueStyle={{ color: EXPENSE_COLOR, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="stat-card">
            <Statistic
              title="本月结余"
              value={balance}
              precision={2}
              prefix="¥"
              loading={summaryLoading}
              valueStyle={{
                color: balance >= 0 ? INCOME_COLOR : EXPENSE_COLOR,
                fontWeight: 600,
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="stat-card">
            <Statistic
              title="账户数量"
              value={accounts.length}
              suffix="个"
              valueStyle={{ fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      <FinanceCharts summary={summary} loading={summaryLoading} />

      <Card
        bordered={false}
        title="最近交易"
        extra={
          <Button type="link" onClick={() => navigate('/transactions')}>
            查看全部
          </Button>
        }
      >
        <Table<Transaction>
          rowKey="id"
          size="small"
          columns={recentColumns}
          dataSource={recent}
          loading={recentLoading}
          pagination={false}
          scroll={{ x: 720 }}
          locale={{ emptyText: '暂无交易记录' }}
        />
      </Card>
    </Space>
  );
}
