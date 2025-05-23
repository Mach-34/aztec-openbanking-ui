import {
  ChangeEvent,
  Dispatch,
  HTMLInputTypeAttribute,
  JSX,
  SetStateAction,
} from 'react';

type InputProps = {
  className?: string;
  error?: string;
  onChange: Dispatch<SetStateAction<string>>;
  placeholder?: string;
  title: string;
  type?: HTMLInputTypeAttribute;
  value: string;
};

export default function Input({
  className,
  error,
  onChange,
  placeholder,
  title,
  type,
  value,
}: InputProps): JSX.Element {
  const handleInputValidation = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (type === 'number') {
      value = value
        .replace(/[^0-9.]/g, '') // Remove non-numeric characters except '.'
        .replace(/^(\d*\.?\d{0,2}).*$/, '$1') // Limit to 2 decimal places
        .replace(/^(\d*\.)(.*)\./, '$1$2');
      if (value === '0') {
        value = '1';
      }
    }
    onChange(value);
  };

  return (
    <div className={className}>
      <div className='text-[#913DE5] text-sm mb-1'>{title}</div>
      <input
        className={`${error ? 'border-red-500' : ''} w-full`}
        onChange={(e) => handleInputValidation(e)}
        placeholder={placeholder}
        value={value}
      />
      <div className='mt-1 text-red-500 text-xs'>{error}</div>
    </div>
  );
}
