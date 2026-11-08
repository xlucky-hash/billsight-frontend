import {
  CloudUploadOutlined,
  InboxOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Steps,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import {
  confirmBatch,
  getBatchDetail,
  getBatchRecords,
  listBatches,
  retryBatch,
} from '@/api/importBatches';
import { uploadFile } from '@/api/files';
import AccountSelect from '@/components/AccountSelect';
import AmountText from '@/components/AmountText';
import CategoryTreeSelect from '@/components/CategoryTreeSelect';
import StatusTag from '@/components/StatusTag';
import type {
  BatchDetail,
  BatchStatus,
  ImportBatch,
  ImportRecord,
  SourceType,
} from '@/types/importBatch';
import {
  BATCH_STATUS_OPTIONS,
  CLASSIFY_SOURCE_META,
  LOW_CONFIDENCE,
  SOURCE_TYPE_META,
} from '@/utils/constants';
import { formatDateTime, formatPercent } from '@/utils/format';

function inferSourceType(fileName: string): SourceType {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff'].includes(ext)) return 'OCR';
  if (ext === 'xlsx' || ext === 'xls') return 'EXCEL';
  return 'CSV';
}

function stepCurrent(batch: BatchDetail | null): number {
  if (!batch) return 0;
  if (batch.status === 'PENDING_REVIEW') return 2;
  if (batch.status === 'CONFIRMED') return 3;
  return 1;
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState('create');

  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>('CSV');
  const [accountId, setAccountId] = useState<number | undefined>();
  const [startLoading, setStartLoading] = useState(false);

  const [activeBatch, setActiveBatch] = useState<BatchDetail | null>(null);
  const [reviewRows, setReviewRows] = useState<ImportRecord[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [corrections, setCorrections] = useState<Record<number, number>>({});
  const [confirming, setConfirming] = useState(false);

  const [historyRows, setHistoryRows] = useState<ImportBatch[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyStatus, setHistoryStatus] = useState<BatchStatus | undefined>();
  const [historyLoading, setHistoryLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadReview = useCallback(async (batchId: string) => {
    setReviewLoading(true);
    try {
      const result = await getBatchRecords(batchId);
      setReviewRows(result);
    } catch {
      setReviewRows([]);
    } finally {
      setReviewLoading(false);
    }
  }, []);

  const loadHistory = useCallback(
    async (page: number, pageSize: number, status?: BatchStatus) => {
      setHistoryLoading(true);
      try {
        const result = await listBatches({ page, pageSize, status });
        setHistoryRows(result.rows);
        setHistoryTotal(result.total);
      } catch {
        setHistoryRows([]);
        setHistoryTotal(0);
      } finally {
        setHistoryLoading(false);
      }
    },
    [],
  );

  const activeBatchId = activeBatch?.batchId;
  const activeBatchStatus = activeBatch?.status;

  useEffect(() => {
    if (!activeBatchId || !activeBatchStatus) return;
    if (activeBatchStatus !== 'PARSING') return;
    const timer = window.setInterval(async () => {
      try {
        const detail = await getBatchDetail(activeBatchId);
        setActiveBatch(detail);
        if (detail.status === 'PENDING_REVIEW') {
          window.clearInterval(timer);
          loadReview(detail.batchId);
        }
      } catch {
        window.clearInterval(timer);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeBatchId, activeBatchStatus, loadReview]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory(historyPage, historyPageSize, historyStatus);
    }
  }, [activeTab, historyPage, historyPageSize, historyStatus, loadHistory]);

  const handleFileChange = (nextFile: File) => {
    setFile(nextFile);
    setSourceType(inferSourceType(nextFile.name));
    return false;
  };

  const handleStart = async () => {
    if (!file) {
      message.warning('请先选择需要导入的文件');
      return;
    }
    if (!accountId) {
      message.warning('请选择关联账户');
      return;
    }
    setStartLoading(true);
    setCorrections({});
    setReviewRows([]);
    try {
      const result = await uploadFile(file, accountId);
      setActiveBatch({ batchId: result.batchId, status: 'PARSING' });
      message.success('文件已接收，正在后台解析');
    } catch {
      // 错误提示由请求拦截器统一处理
    } finally {
      setStartLoading(false);
    }
  };

  const handleRetry = async (batchId: string) => {
    setRetryingId(batchId);
    try {
      const next = await retryBatch(batchId);
      setActiveBatch(next);
      setActiveTab('create');
      setCorrections({});
      setReviewRows([]);
      message.success('已重新提交解析');
    } catch {
      // 错误提示由请求拦截器统一处理
    } finally {
      setRetryingId(null);
    }
  };

  const handleContinueReview = (batch: ImportBatch) => {
    setActiveBatch({
      batchId: batch.batchId,
      status: batch.status,
      totalCount: batch.totalCount,
      failReason: batch.failReason,
    });
    setActiveTab('create');
    setCorrections({});
    loadReview(batch.batchId);
  };

  const handleCorrection = (record: ImportRecord, categoryId: number | undefined) => {
    setCorrections((prev) => {
      const next = { ...prev };
      if (!categoryId || categoryId === record.systemCategoryId) {
        delete next[record.txnId];
      } else {
        next[record.txnId] = categoryId;
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!activeBatch) return;
    const correctionList = Object.entries(corrections).map(([id, categoryId]) => ({
      txnId: Number(id),
      newCategoryId: categoryId,
    }));
    setConfirming(true);
    try {
      const result = await confirmBatch(activeBatch.batchId, {
        confirmAll: true,
        corrections: correctionList,
      });
      setActiveBatch(null);
      setReviewRows([]);
      setCorrections({});
      setFile(null);
      setHistoryPage(1);
      setActiveTab('history');
      Modal.success({
        title: '确认入库成功',
        content: (
          <Space direction="vertical" size={4}>
            <span>成功入库：{result.confirmed} 条</span>
            <span>分类修正：{result.corrected} 条</span>
            <span>反哺规则：{result.rulesUpdated} 条</span>
          </Space>
        ),
      });
    } catch {
      // 错误提示由请求拦截器统一处理
    } finally {
      setConfirming(false);
    }
  };

  const reviewColumns: ColumnsType<ImportRecord> = [
      {
        title: '交易时间',
        dataIndex: 'txnTime',
        width: 150,
        render: (value: string) => formatDateTime(value),
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
        title: '金额',
        dataIndex: 'amount',
        width: 130,
        align: 'right',
        render: (value: number) => <AmountText value={value} colored={false} />,
      },
      {
        title: '分类（可修正）',
        dataIndex: 'systemCategoryName',
        width: 220,
        render: (_value: string, record) => (
          <CategoryTreeSelect
            value={corrections[record.txnId] ?? record.systemCategoryId ?? undefined}
            onChange={(value) => handleCorrection(record, value)}
            placeholder="请选择分类"
            style={{ width: 190 }}
          />
        ),
      },
      {
        title: '置信度',
        dataIndex: 'confidence',
        width: 100,
        render: (value: number) => (
          <Tag color={value < LOW_CONFIDENCE ? 'orange' : 'green'}>{formatPercent(value)}</Tag>
        ),
      },
      {
        title: '分类来源',
        dataIndex: 'classifySource',
        width: 110,
        render: (value: ImportRecord['classifySource']) => (
          <Tag color={CLASSIFY_SOURCE_META[value].color}>{CLASSIFY_SOURCE_META[value].label}</Tag>
        ),
      },
    ];

  const historyColumns: ColumnsType<ImportBatch> = [
      { title: '批次 ID', dataIndex: 'batchId', width: 110 },
      {
        title: '来源',
        dataIndex: 'sourceType',
        width: 160,
        render: (value: SourceType) => (
          <Tag color={SOURCE_TYPE_META[value].color}>{SOURCE_TYPE_META[value].label}</Tag>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 120,
        render: (value: BatchStatus, record) => (
          <StatusTag status={value} failReason={record.failReason} />
        ),
      },
      {
        title: '进度',
        key: 'progress',
        width: 100,
        render: (_value, record) => `${record.successCount ?? 0}/${record.totalCount ?? 0}`,
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        width: 160,
        render: (value: string) => formatDateTime(value),
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        render: (_value, record) => {
          if (record.status === 'PENDING_REVIEW') {
            return (
              <Button type="link" size="small" onClick={() => handleContinueReview(record)}>
                继续校对
              </Button>
            );
          }
          if (record.status === 'FAILED') {
            return (
              <Button
                type="link"
                size="small"
                danger
                icon={<ReloadOutlined />}
                loading={retryingId === record.batchId}
                onClick={() => handleRetry(record.batchId)}
              >
                重试
              </Button>
            );
          }
          return <Typography.Text type="secondary">-</Typography.Text>;
        },
      },
    ];

  const processing = activeBatch !== null && activeBatch.status === 'PARSING';
  const failed = activeBatch?.status === 'FAILED';
  const showReview = activeBatch?.status === 'PENDING_REVIEW';

  const createPanel = (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false} title="新建导入">
        <Row gutter={[24, 16]}>
          <Col xs={24} lg={13}>
            <Upload.Dragger
              beforeUpload={(nextFile) => handleFileChange(nextFile as File)}
              showUploadList={false}
              accept=".csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp,.gif,.bmp"
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽账单文件到此区域</p>
              <p className="ant-upload-hint">支持 CSV、Excel、图片 OCR，后端按文件后缀自动选择解析器</p>
            </Upload.Dragger>
            {file ? (
              <Space style={{ marginTop: 12 }} wrap>
                <Tag color="blue">{file.name}</Tag>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  将由后端按后缀识别为「{SOURCE_TYPE_META[sourceType].label}」
                </Typography.Text>
                <Button type="link" size="small" onClick={() => setFile(null)}>
                  移除文件
                </Button>
              </Space>
            ) : null}
          </Col>
          <Col xs={24} lg={11}>
            <Form layout="vertical">
              <Form.Item label="关联账户" required>
                <AccountSelect value={accountId} onChange={setAccountId} />
              </Form.Item>
              <Button
                type="primary"
                block
                icon={<CloudUploadOutlined />}
                loading={startLoading}
                disabled={processing}
                onClick={handleStart}
              >
                开始导入
              </Button>
            </Form>
          </Col>
        </Row>
      </Card>

      {activeBatch ? (
        <Card bordered={false} title="解析进度">
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space wrap>
              <Typography.Text strong>批次 #{activeBatch.batchId}</Typography.Text>
              <StatusTag status={activeBatch.status} failReason={activeBatch.failReason} />
            </Space>
            <Steps
              size="small"
              current={stepCurrent(activeBatch)}
              status={failed ? 'error' : activeBatch.status === 'CONFIRMED' ? 'finish' : 'process'}
              items={[
                { title: '上传文件' },
                { title: '智能解析' },
                { title: '校对入库' },
              ]}
            />
            {processing ? (
              <Space>
                <Spin size="small" />
                <Typography.Text type="secondary">
                  正在解析账单，每秒自动刷新状态…
                </Typography.Text>
              </Space>
            ) : null}
            {failed ? (
              <Alert
                type="error"
                showIcon
                message="解析失败"
                description={activeBatch.failReason || '未知原因'}
                action={
                  <Button
                    size="small"
                    danger
                    loading={retryingId === activeBatch.batchId}
                    onClick={() => handleRetry(activeBatch.batchId)}
                  >
                    重试
                  </Button>
                }
              />
            ) : null}
            {showReview ? (
              <Alert
                type="success"
                showIcon
                message="解析完成，已进入待校对状态"
                description="请在下方核对分类，低置信度行会标黄显示。"
              />
            ) : null}
          </Space>
        </Card>
      ) : null}

      {showReview ? (
        <Card
          bordered={false}
          title={
            <Space wrap>
              <span>待校对交易</span>
              <Tag color="blue">共 {reviewRows.length} 条</Tag>
              {Object.keys(corrections).length ? (
                <Tag color="orange">已修正 {Object.keys(corrections).length} 条</Tag>
              ) : null}
            </Space>
          }
          extra={
            <Button
              type="primary"
              loading={confirming}
              disabled={reviewLoading || reviewRows.length === 0}
              onClick={handleConfirm}
            >
              确认入库
            </Button>
          }
        >
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="置信度低于 60% 的行已标黄，请重点核对；仅提交修改过的分类。"
          />
          <Table<ImportRecord>
            rowKey="txnId"
            size="small"
            columns={reviewColumns}
            dataSource={reviewRows}
            loading={reviewLoading}
            pagination={false}
            scroll={{ x: 960 }}
            rowClassName={(record) =>
              record.confidence < LOW_CONFIDENCE ? 'low-confidence-row' : ''
            }
            locale={{ emptyText: '暂无待校对交易' }}
          />
        </Card>
      ) : null}
    </Space>
  );

  const historyPanel = (
    <Card bordered={false} title="导入历史">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space wrap>
          <Select
            allowClear
            placeholder="全部状态"
            value={historyStatus}
            onChange={(value) => {
              setHistoryStatus(value as BatchStatus | undefined);
              setHistoryPage(1);
            }}
            options={BATCH_STATUS_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
            style={{ width: 160 }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => loadHistory(historyPage, historyPageSize, historyStatus)}
          >
            刷新
          </Button>
        </Space>
        <Table<ImportBatch>
          rowKey="batchId"
          columns={historyColumns}
          dataSource={historyRows}
          loading={historyLoading}
          scroll={{ x: 1100 }}
          pagination={{
            current: historyPage,
            pageSize: historyPageSize,
            total: historyTotal,
            showSizeChanger: true,
            showTotal: (count) => `共 ${count} 条`,
            onChange: (page, pageSize) => {
              setHistoryPage(page);
              setHistoryPageSize(pageSize);
            },
          }}
          locale={{ emptyText: '暂无导入记录' }}
        />
      </Space>
    </Card>
  );

  return (
    <Card bordered={false}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'create', label: '新建导入', children: createPanel },
          { key: 'history', label: '导入历史', children: historyPanel },
        ]}
      />
    </Card>
  );
}
