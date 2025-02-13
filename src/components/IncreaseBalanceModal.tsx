import { useEffect, useState } from 'react';
import Modal, { ModalProps } from './Modal';
import Input from './Input';

type IncreaseBalanceModalProps = {
  onFinish: (amount: bigint) => Promise<void>;
} & Omit<ModalProps, 'children' | 'title'>;

export default function IncreaseBalanceModal({
  onClose,
  onFinish,
  open,
}: IncreaseBalanceModalProps): JSX.Element {
  const [amount, setAmount] = useState('');
  const [increasingBalance, setIncreasingBalance] = useState<boolean>(false);

  const onIncreaseBalance = async () => {
    setIncreasingBalance(true);
    try {
      await onFinish(BigInt(amount));
      onClose();
    } catch {
    } finally {
      setIncreasingBalance(false);
    }
  };

  useEffect(() => {
    setAmount('');
  }, [open]);

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
        onChange={setAmount}
        placeholder='Enter amount...'
        value={amount}
        title='Deposit Amount'
        type='number'
      />
    </Modal>
  );
}
