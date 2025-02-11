import { useState } from 'react';
import Modal, { ModalProps } from './Modal';

type DepositModalProps = {
  onFinish: (sortCode: string, currencyCode: string, amount: number) => void;
} & Omit<ModalProps, 'children'>;

export default function DepositModal({
  onClose,
  onFinish,
  open,
}: DepositModalProps): JSX.Element {
  const [amount, setAmount] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [sortCode, setSortCode] = useState('');
  return (
    <Modal bgColor='black' onClose={onClose} open={open}>
      <div className='flex flex-col items-center gap-5 mb-10'>
        <input
          onChange={(e) => setSortCode(e.target.value)}
          placeholder='Sort code'
          value={sortCode}
        />
        <input
          onChange={(e) => setCurrencyCode(e.target.value)}
          placeholder='Currency code'
          value={currencyCode}
        />
        <input
          onChange={(e) => setAmount(e.target.value)}
          placeholder='Amount'
          value={amount}
        />
      </div>
      <button onClick={() => onFinish(sortCode, currencyCode, Number(amount))}>
        Deposit
      </button>
    </Modal>
  );
}
