import { useState } from 'react';
import Modal, { ModalProps } from './Modal';
import Input from './Input';

type IncreaseBalanceModalProps = { onFinish: (amount: bigint) => void } & Omit<
  ModalProps,
  'children' | 'title'
>;

export default function IncreaseBalanceModal({
  onClose,
  onFinish,
  open,
}: IncreaseBalanceModalProps): JSX.Element {
  const [amount, setAmount] = useState('');
  const [increasingBalance, setIncreasingBalance] = useState<boolean>(false);

  const onIncreaseBalance = () => {
    setIncreasingBalance(true);
    onFinish(BigInt(amount));
    onClose();
  };

  return (
    <Modal
      action={{
        onClick: () => onIncreaseBalance(),
        loading: increasingBalance,
        text: increasingBalance ? 'Increasing balance...' : 'Increase balance',
      }}
      onClose={onClose}
      open={open}
      title='Increase Position Balance'
    >
      <Input
        className='w-3/4'
        onChange={(e) => setAmount(e.target.value)}
        placeholder='Enter amount...'
        value={amount}
        title='Deposit Amount'
      />
    </Modal>
  );
}
