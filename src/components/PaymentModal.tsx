import { useState } from 'react';
import Loader from './Loader';
import Modal, { ModalProps } from './Modal';
import PaymentChecklist from './PaymentChecklist';

type PaymentModalProps = { onFinish: () => Promise<void> } & Omit<
  ModalProps,
  'children' | 'title'
>;

export default function PaymentModal({
  onClose,
  onFinish,
  open,
}: PaymentModalProps): JSX.Element {
  const [makingPayment, setMakingPayment] = useState<boolean>(false);

  const onPaymentflow = async () => {
    setMakingPayment(true);
    await onFinish();
    setMakingPayment(false);
  };

  return (
    <Modal
      action={{
        loading: makingPayment,
        onClick: () => onPaymentflow(),
        text: 'Authorize Revolut',
      }}
      height={80}
      onClose={onClose}
      open={open}
      title='Payment initiated'
    >
      <PaymentChecklist currentStep={2} />
    </Modal>
  );
}
