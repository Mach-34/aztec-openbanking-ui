import { useEffect, useState } from 'react';
import Modal, { ModalProps } from './Modal';
import Input from './Input';

type WithdrawModalProps = {
  onFinish: (amount: bigint) => Promise<void>;
} & Omit<ModalProps, 'children' | 'title'>;

export default function WithdrawModal({
  onClose,
  onFinish,
  open,
}: WithdrawModalProps): JSX.Element {
  const [amount, setAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState<boolean>(false);

  const onWithdraw = async () => {
    setWithdrawing(true);
    try {
      await onFinish(BigInt(amount));
      onClose();
    } catch {
    } finally {
      setWithdrawing(false);
    }
  };

  useEffect(() => {
    setAmount('');
  }, [open]);

  return (
    <Modal
      action={{
        onClick: () => onWithdraw(),
        loading: withdrawing,
        text: withdrawing ? 'Withdrawing...' : 'Withdraw',
      }}
      onClose={onClose}
      open={open}
      title='Withdraw From Balance'
    >
      <Input
        className='w-3/4'
        onChange={setAmount}
        placeholder='Enter amount...'
        value={amount}
        title='Withdraw Amount'
        type='number'
      />
    </Modal>
  );
}
