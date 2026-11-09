import { DownloadOutlined, FallOutlined, RiseOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Progress, Row, Space, Statistic, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { exportReport, getReportSummary } from '@/api/reports';
import { listTransactions } from '@/api/transactions';
import AccountSelect from '@/components/AccountSelect';
import FinanceCharts from '@/components/FinanceCharts';
import type { CategoryAmount, ReportSummary } from '@/types/report';
import { EXPENSE_COLOR, INCOME_COLOR } from '@/utils/constants';
import { formatAmount } from '@/utils/format';

interface MerchantStat {
  name: string;
  amount: number;
  count: number;
}

/** 环比百分比，prev<=0 时返回 null */
function momRate(current: number, prev: number): number | null {
  if (!prev || prev <= 0) return null;
  return ((current - prev) / prev) * 100;
}

function MomText({ rate, goodWhenUp = true }: { rate: number | null; goodWhenUp?: boolean }) {
  if (rate === null) {
    return <Typography.Text type="secondary">较上月 -</Typography.Text>;
  }
  const up = rate >= 0;
  const good = up === goodWhenUp;
  return (
    <Typography.Text style={{ color: good ? INCOME_COLOR : EXPENSE_COLOR }}>
      {up ? <RiseOutlined /> : <FallOutlined />} 较上月 {up ? '+' : ''}
      {rate.toFixed(1)}%
    </Typography.Text>
  );
}

export default function ReportsPage() {
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [accountId, setAccountId] = useState<number | undefined>();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [prevSummary, setPrevSummary] = useState<ReportSummary | null>(null);
  const [merchants, setMerchants] = useState<MerchantStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let alive = true;
    const prev = month.subtract(1, 'month');
    setLoading(true);
    Promise.all([
      getReportSummary({ year: month.year(), month: month.month() + 1, accountId }),
      getReportSummary({ year: prev.year(), month: prev.month() + 1, accountId }),
      listTransactions({
        begin: month.startOf('month').format('YYYY-MM-DD'),
        end: month.endOf('month').format('YYYY-MM-DD'),
        accountId,
        direction: 'EXPENSE',
        page: 1,
        pageSize: 200,
      }),
    ])
      .then(([cur, pre, txnPage]) => {
        if (!alive) return;
        setSummary(cur);
        setPrevSummary(pre);
        const map = new Map<string, MerchantStat>();
        txnPage.rows.forEach((t) => {
          const key = t.counterparty || '未知商户';
          const item = map.get(key) ?? { name: key, amount: 0, count: 0 };
          item.amount += t.amount;
          item.count += 1;
          map.set(key, item);
        });
        setMerchants(
          [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, 8),
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [month, accountId]);

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
  const incomeMom = momRate(summary?.incomeTotal ?? 0, prevSummary?.incomeTotal ?? 0);
  const expenseMom = momRate(summary?.expenseTotal ?? 0, prevSummary?.expenseTotal ?? 0);
  const prevBalance = (prevSummary?.incomeTotal ?? 0) - (prevSummary?.expenseTotal ?? 0);
  const balanceMom = prevSummary ? momRate(balance, prevBalance) : null;

  const merchantMax = merchants[0]?.amount ?? 1;

  const categoryColumns: ColumnsType<CategoryAmount> = useMemo(
    () => [
      { title: '分类', dataIndex: 'name', width: 120 },
      {
        title: '金额',
        dataIndex: 'amount',
        align: 'right',
        width: 140,
        render: (v: number) => `¥${formatAmount(v)}`,
      },
      {
        title: '占比',
        dataIndex: 'ratio',
        render: (v: number) => (
          <Progress
            percent={Math.round((v ?? 0) * 1000) / 10}
            size="small"
            strokeColor={EXPENSE_COLOR}
          />
        ),
      },
    ],
    [],
  );

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
        <Col xs={24} sm={8}>
          <Card bordered={false} className="stat-card">
            <Statistic
              title="本月收入合计"
              value={summary?.incomeTotal ?? 0}
              precision={2}
              prefix="¥"
              loading={loading}
              valueStyle={{ color: INCOME_COLOR, fontWeight: 600 }}
            />
            <MomText rate={incomeMom} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="stat-card">
            <Statistic
              title="本月支出合计"
              value={summary?.expenseTotal ?? 0}
              precision={2}
              prefix="¥"
              loading={loading}
              valueStyle={{ color: EXPENSE_COLOR, fontWeight: 600 }}
            />
            <MomText rate={expenseMom} goodWhenUp={false} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="stat-card">
            <Statistic
              title="本月结余"
              value={balance}
              precision={2}
              prefix="¥"
              loading={loading}
              valueStyle={{
                color: balance >= 0 ? INCOME_COLOR : EXPENSE_COLOR,
                fontWeight: 600,
              }}
            />
            <MomText rate={balanceMom} />
          </Card>
        </Col>
      </Row>

      <FinanceCharts summary={summary} loading={loading} />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card bordered={false} title="支出分类明细" size="small">
            <Table<CategoryAmount>
              rowKey={(r) => r.categoryId ?? r.name}
              columns={categoryColumns}
              dataSource={summary?.expenseByCategory ?? []}
              loading={loading}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card bordered={false} title="TOP 商户（本月支出）" size="small">
            {merchants.length === 0 && !loading ? (
              <Typography.Text type="secondary">暂无支出记录</Typography.Text>
            ) : (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {merchants.map((m, i) => (
                  <div key={m.name}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Typography.Text>
                        {i + 1}. {m.name}
                        <Typography.Text type="secondary">（{m.count} 笔）</Typography.Text>
                      </Typography.Text>
                      <Typography.Text strong>¥{formatAmount(m.amount)}</Typography.Text>
                    </Space>
                    <Progress
                      percent={Math.round((m.amount / merchantMax) * 100)}
                      showInfo={false}
                      size="small"
                      strokeColor={EXPENSE_COLOR}
                    />
                  </div>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
