import ReactECharts from 'echarts-for-react';
import { Card, Col, Empty, Row } from 'antd';
import type { CategoryAmount, ReportSummary, TrendPoint } from '@/types/report';
import { CHART_COLORS, EXPENSE_COLOR, INCOME_COLOR } from '@/utils/constants';

const EMPTY_STYLE = {
  height: 280,
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'center',
};

interface PieDatum {
  name: string;
  value: number;
}

function pieOption(data: PieDatum[]) {
  return {
    color: CHART_COLORS,
    tooltip: {
      trigger: 'item',
      formatter: '{b}<br/>¥{c}（{d}%）',
    },
    legend: {
      bottom: 0,
      type: 'scroll',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
    },
    series: [
      {
        type: 'pie',
        radius: ['42%', '66%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontWeight: 600 } },
        data,
      },
    ],
  };
}

function trendOption(trend: TrendPoint[]) {
  return {
    color: [INCOME_COLOR, EXPENSE_COLOR],
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: unknown) =>
        `¥${Number(value ?? 0).toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
    },
    legend: { bottom: 0, icon: 'roundRect' },
    grid: { top: 24, left: 12, right: 24, bottom: 48, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trend.map((item) => item.month),
      axisLine: { lineStyle: { color: '#e5e5e5' } },
      axisLabel: { color: '#8c8c8c' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#8c8c8c' },
    },
    series: [
      {
        name: '收入',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: trend.map((item) => item.income),
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.08 },
      },
      {
        name: '支出',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: trend.map((item) => item.expense),
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.08 },
      },
    ],
  };
}

interface FinanceChartsProps {
  summary: ReportSummary | null;
  loading?: boolean;
}

function toPieData(list: CategoryAmount[]): PieDatum[] {
  return list.map((item) => ({ name: item.name, value: item.amount }));
}

export default function FinanceCharts({ summary, loading }: FinanceChartsProps) {
  const expensePie = toPieData(summary?.expenseByCategory ?? []);
  const incomePie = toPieData(summary?.incomeByCategory ?? []);
  const trend = summary?.monthlyTrend ?? [];

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card bordered={false} className="chart-card" title="支出构成" loading={loading}>
          {expensePie.length ? (
            <ReactECharts
              option={pieOption(expensePie)}
              style={{ height: 280 }}
              notMerge
              lazyUpdate
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无支出数据"
              style={EMPTY_STYLE}
            />
          )}
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card bordered={false} className="chart-card" title="收入构成" loading={loading}>
          {incomePie.length ? (
            <ReactECharts
              option={pieOption(incomePie)}
              style={{ height: 280 }}
              notMerge
              lazyUpdate
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无收入数据"
              style={EMPTY_STYLE}
            />
          )}
        </Card>
      </Col>
      <Col xs={24}>
        <Card bordered={false} className="chart-card" title="近 6 个月收支趋势" loading={loading}>
          {trend.length ? (
            <ReactECharts option={trendOption(trend)} style={{ height: 300 }} notMerge lazyUpdate />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无趋势数据"
              style={EMPTY_STYLE}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
}
