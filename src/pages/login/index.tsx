import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@/api/auth';
import type { LoginParams } from '@/types/auth';
import { useUserStore } from '@/store/userStore';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const setLogin = useUserStore((state) => state.login);
  const navigate = useNavigate();

  const handleFinish = async (values: LoginParams) => {
    setLoading(true);
    try {
      const result = await login(values);
      setLogin(result.token, { id: result.id, username: result.username, name: result.name });
      navigate('/dashboard', { replace: true });
    } catch {
      // 错误提示由请求拦截器统一处理
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Card className="login-card" bordered={false}>
        <div className="login-header">
          <div className="app-logo-mark" style={{ margin: '0 auto 12px', width: 44, height: 44 }}>
            账
          </div>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            多源账单管理
          </Typography.Title>
          <Typography.Text type="secondary">
            个人财务分析系统 · 统一管理你的每一笔收支
          </Typography.Text>
        </div>
        <Form<LoginParams>
          layout="vertical"
          size="large"
          initialValues={{ username: 'admin', password: '123456' }}
          onFinish={handleFinish}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          演示账号：admin / 123456（Mock 模式下固定 token）
        </Typography.Text>
      </Card>
    </div>
  );
}
