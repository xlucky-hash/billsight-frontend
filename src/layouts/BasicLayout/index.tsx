import {
  BarChartOutlined,
  BankOutlined,
  CloudUploadOutlined,
  DashboardOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  SwapOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Dropdown, Layout, Menu, Space, Typography } from 'antd';
import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';

const { Header, Sider, Content } = Layout;

const MENU_ITEMS = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '概览' },
  { key: '/import', icon: <CloudUploadOutlined />, label: '账单导入' },
  { key: '/transactions', icon: <SwapOutlined />, label: '交易明细' },
  { key: '/reports', icon: <BarChartOutlined />, label: '财务报表' },
  { key: '/accounts', icon: <BankOutlined />, label: '账户管理' },
  { key: '/rules', icon: <SafetyCertificateOutlined />, label: '规则与修正' },
];

export default function BasicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  const selectedKey = useMemo(() => {
    const matched = MENU_ITEMS.find((item) => location.pathname.startsWith(item.key));
    return matched?.key ?? '/dashboard';
  }, [location.pathname]);

  const pageTitle = MENU_ITEMS.find((item) => item.key === selectedKey)?.label ?? '概览';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div className="app-logo">
          <div className="app-logo-mark">账</div>
          <div>
            <div className="app-logo-title">账单分析</div>
            <div className="app-logo-sub">Multi-Source Billing</div>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={MENU_ITEMS}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Typography.Title level={4} style={{ margin: 0 }}>
            {pageTitle}
          </Typography.Title>
          <Dropdown
            menu={{
              items: [{ key: 'logout', label: '退出登录', icon: <LogoutOutlined /> }],
              onClick: ({ key }) => {
                if (key === 'logout') handleLogout();
              },
            }}
          >
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ background: '#1677ff' }} />
              <span>{user?.name || user?.username || '未登录'}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
