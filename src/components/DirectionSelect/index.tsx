import type { CSSProperties } from 'react';
import { Select } from 'antd';
import type { Direction } from '@/types/transaction';
import { DIRECTION_OPTIONS } from '@/utils/constants';

interface DirectionSelectProps {
  value?: Direction;
  onChange?: (value: Direction | undefined) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
}

export default function DirectionSelect({
  value,
  onChange,
  placeholder = '收支方向',
  allowClear = true,
  disabled,
  style,
}: DirectionSelectProps) {
  return (
    <Select
      value={value}
      onChange={(next) => onChange?.(next as Direction | undefined)}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabled}
      options={DIRECTION_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
      style={{ minWidth: 120, ...style }}
    />
  );
}
