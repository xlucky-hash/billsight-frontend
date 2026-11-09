import { PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { createAccount, deleteAccount, listAccounts, updateAccount } from '@/api/accounts';
import AmountText from '@/components/AmountText';
import type { Account, AccountPayload, AccountType } from '@/types/account';
import { ACCOUNT_TYPE_META, ACCOUNT_TYPE_OPTIONS } from '@/utils/constants';
import { formatDateTime } from '@/utils/format';

/** 表单值：契约字段 name/type + 仅展示的 balance/remark */
interface AccountFormValues extends AccountPayload {
  balance?: number | null;
  remark?: string;
}

export default function AccountsPage() {
  const [rows, setRows] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<AccountFormValues>();

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAccounts();
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'BANK', balance: null });
    setModalOpen(true);
  };

  const openEdit = (record: Account) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      balance: record.balance,
      remark: undefined,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: AccountFormValues) => {
    setSaving(true);
    try {
      if (editing) {
        await updateAccount({ id: editing.id, name: values.name, type: values.type });
        message.success('账户已更新');
      } else {
        await createAccount({ name: values.name, type: values.type });
        message.success('账户已创建');
      }
      setModalOpen(false);
      load();
    } catch {
      // 错误提示由请求拦截器统一处理
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: Account) => {
    try {
      await deleteAccount(record.id);
      message.success('账户已删除');
      load();
    } catch {
      // 错误提示由请求拦截器统一处理
    }
  };

  const columns: ColumnsType<Account> = [
    { title: '账户名称', dataIndex: 'name' },
    {
      title: '账户类型',
      dataIndex: 'type',
      width: 120,
      render: (value: AccountType) => (
        <Tag color={ACCOUNT_TYPE_META[value].color}>{ACCOUNT_TYPE_META[value].label}</Tag>
      ),
    },
    {
      title: '余额',
      dataIndex: 'balance',
      width: 160,
      align: 'right',
      render: (value: number | null) => <AmountText value={value} colored={false} />,
    },
    { title: '备注', dataIndex: 'remark', render: (value: string) => value || '-' },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_value, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该账户？"
            description="删除后关联交易的账户信息仍会保留。"
            okText="删除"
            cancelText="取消"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card bordered={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增账户
          </Button>
        </Space>
        <Table<Account>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={false}
          locale={{ emptyText: '暂无账户，点击右上角新增' }}
        />
      </Space>

      <Modal
        title={editing ? '编辑账户' : '新增账户'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form<AccountFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="账户名称"
            rules={[{ required: true, message: '请输入账户名称' }]}
          >
            <Input placeholder="例如：招商银行储蓄卡" maxLength={30} />
          </Form.Item>
          <Form.Item name="type" label="账户类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select
              placeholder="请选择账户类型"
              options={ACCOUNT_TYPE_OPTIONS.map((item) => ({
                value: item.value,
                label: item.label,
              }))}
            />
          </Form.Item>
          <Form.Item name="balance" label="账户余额">
            <InputNumber
              style={{ width: '100%' }}
              precision={2}
              placeholder="可留空，留空显示 -"
            />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="选填" maxLength={100} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
