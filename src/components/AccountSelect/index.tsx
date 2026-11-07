import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Select } from 'antd';
import { listAccounts } from '@/api/accounts';
import type { Account } from '@/types/account';
import { ACCOUNT_TYPE_META } from '@/utils/constants';

interface AccountSelectProps {
  value?: number;
  onChange?: (value: number | undefined) => void;
  allowAll?: boolean;
  allowClear?: boolean;
  placeholder?: string;
  disabled?: boolean;
  style?: CSSProperties;
}

/** 账户选择器，allowAll 时提供“全部账户”选项 */
export default function AccountSelect({
  value,
  onChange,
  allowAll = false,
  allowClear = false,
  placeholder = '请选择账户',
  disabled,
  style,
}: AccountSelectProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listAccounts()
      .then((data) => {
        if (alive) setAccounts(data);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const options = accounts.map((account) => ({
    value: account.id,
    label: `${account.name}（${ACCOUNT_TYPE_META[account.type].label}）`,
  }));

  const mergedOptions = allowAll
    ? [{ value: 0, label: '全部账户' }, ...options]
    : options;

  const mergedValue = allowAll ? (value ?? 0) : value;

  return (
    <Select
      value={mergedValue}
      onChange={(next) => {
        const numeric = next as number | undefined;
        onChange?.(numeric === 0 ? undefined : numeric);
      }}
      options={mergedOptions}
      loading={loading}
      placeholder={allowAll ? '全部账户' : placeholder}
      allowClear={allowClear && !allowAll}
      disabled={disabled}
      showSearch
      optionFilterProp="label"
      style={{ minWidth: 180, ...style }}
    />
  );
}
