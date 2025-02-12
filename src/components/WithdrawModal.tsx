import { useState } from 'react';
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
    await onFinish(BigInt(amount));
    setWithdrawing(false);
    onClose();
  };

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
        onChange={(e) => setAmount(e.target.value)}
        placeholder='Enter amount...'
        value={amount}
        title='Withdraw Amount'
      />
    </Modal>
  );
}
