import type { ReactNode } from 'react';
import { Card, Typography } from 'antd';

interface PageContainerProps {
  title?: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}

export default function PageContainer({ title, description, extra, children }: PageContainerProps) {
  return (
    <Card
      bordered={false}
      title={
        title ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
            {description ? (
              <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                {description}
              </Typography.Text>
            ) : null}
          </div>
        ) : undefined
      }
      extra={extra}
    >
      {children}
    </Card>
  );
}
