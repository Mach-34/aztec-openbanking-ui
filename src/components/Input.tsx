import { ChangeEventHandler } from 'react';

type InputProps = {
  className?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  title: string;
  value: string;
};

export default function Input({
  className,
  onChange,
  placeholder,
  title,
  value,
}: InputProps): JSX.Element {
  return (
    <div className={className}>
      <div className='text-[#913DE5] text-sm mb-1'>{title}</div>
      <input
        className='w-full'
        onChange={onChange}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}
