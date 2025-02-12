import { useState } from 'react';
import Modal, { ModalProps } from './Modal';
import Input from './Input';

type WithdrawModalProps = { onFinish: () => void } & Omit<
  ModalProps,
  'children'
>;

export default function WithdrawModal({
  onClose,
  onFinish,
  open,
}: WithdrawModalProps): JSX.Element {
  const [amount, setAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState<boolean>(false);

  const onWithdraw = () => {
    setWithdrawing(true);
    onFinish();
    setTimeout(() => {
      setWithdrawing(false);
    }, 2500);
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
