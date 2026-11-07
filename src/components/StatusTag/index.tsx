import { Tag, Tooltip } from 'antd';
import type { BatchStatus } from '@/types/importBatch';
import { BATCH_STATUS_META } from '@/utils/constants';

interface StatusTagProps {
  status: BatchStatus;
  failReason?: string | null;
}

/** 批次状态标签，FAILED 悬浮展示失败原因 */
export default function StatusTag({ status, failReason }: StatusTagProps) {
  const meta = BATCH_STATUS_META[status] ?? { label: status, color: 'default' };
  const tag = <Tag color={meta.color}>{meta.label}</Tag>;
  if (status === 'FAILED' && failReason) {
    return <Tooltip title={`失败原因：${failReason}`}>{tag}</Tooltip>;
  }
  return tag;
}
