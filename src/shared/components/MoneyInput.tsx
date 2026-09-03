import React, { useState, useEffect } from 'react';

// "AutoNumeric-style" — format tampilan pakai pemisah ribuan otomatis secara real-time,
// simpan angka murni (number) ke state onChange. Mengadopsi sistem MoneyInput dari ProjectOmahBan.

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string;
  onChange: (value: number) => void;
  prefix?: string;
  className?: string;
  placeholder?: string;
}

const idFormatter = new Intl.NumberFormat('id-ID');

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  prefix,
  className = '',
  placeholder = '0',
  ...rest
}) => {
  const numValue = typeof value === 'string' 
    ? (parseInt(value.replace(/[^\d]/g, ''), 10) || 0) 
    : (value || 0);

  const formatDisplay = (n: number): string => {
    return n === 0 ? '' : idFormatter.format(n);
  };

  const [display, setDisplay] = useState<string>(formatDisplay(numValue));

  useEffect(() => {
    setDisplay(formatDisplay(numValue));
  }, [numValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/[^\d]/g, '');
    if (!rawDigits) {
      setDisplay('');
      onChange(0);
      return;
    }

    const parsedNum = parseInt(rawDigits, 10);
    setDisplay(idFormatter.format(parsedNum));
    onChange(parsedNum);
  };

  if (prefix) {
    return (
      <div className="relative flex items-center w-full">
        <span className="absolute left-3 font-bold text-slate-400 text-xs pointer-events-none select-none">
          {prefix}
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={display}
          placeholder={placeholder}
          onChange={handleInputChange}
          className={`pl-9 ${className}`}
          {...rest}
        />
      </div>
    );
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      placeholder={placeholder}
      onChange={handleInputChange}
      className={className}
      {...rest}
    />
  );
};

export const AutoNumericInput = MoneyInput;
