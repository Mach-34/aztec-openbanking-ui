import { useMemo, useState } from 'react';
import Modal, { ModalProps } from '../Modal';
import PaymentChecklist from '../PaymentChecklist';
import Input from '../Input';
import { CreditorData } from '../../utils/data';
import { prepareOpenbankingPayment } from './utils';

type PaymentModalProps = {
  creditiorData: CreditorData | null;
  onFinish: (paymentData: any) => Promise<void>;
} & Omit<ModalProps, 'children' | 'title'>;

export default function PaymentModal({
  creditiorData,
  onClose,
  onFinish,
  open,
}: PaymentModalProps): JSX.Element {
  const [amount, setAmount] = useState('');
  const [paymentFlowIniated, setPaymentFlowInitiated] =
    useState<boolean>(false);

  const paymentFlowData = useMemo(() => {
    if (paymentFlowIniated) {
      return { loading: false, text: 'Authorize Revolut' };
    }
    return { loading: false, text: 'Begin Payment Flow' };
  }, [paymentFlowIniated]);

  const onPaymentInitiation = async () => {
    if (!creditiorData) return;
    setPaymentFlowInitiated(true);
    const paymentData = prepareOpenbankingPayment(creditiorData, amount);
    await onFinish(paymentData);
    setPaymentFlowInitiated(false);
  };

  return (
    <Modal
      action={{
        loading: paymentFlowData.loading,
        onClick: () => amount && onPaymentInitiation(),
        text: paymentFlowData.text,
      }}
      height={paymentFlowIniated ? 80 : 45}
      onClose={onClose}
      open={open}
      title={
        paymentFlowIniated
          ? `Sending $${amount} dollars to ${creditiorData?.name}`
          : `Prepare payment to ${creditiorData?.name}`
      }
    >
      <div className='flex justify-start w-full'>
        {paymentFlowIniated ? (
          <PaymentChecklist
            currentStep={0}
            steps={[
              'Authorize Revolut',
              'Initiating Payment on Revolut',
              'Payment sent. Awaiting confirmation',
              'Prove Payment on Aztec',
            ]}
          />
        ) : (
          <div className='w-full'>
            <div className='flex flex-col mb-4 items-start w-full'>
              <div className='text-lg'>Currency: {creditiorData?.currency}</div>
              <div className='text-lg'>
                Creditor Balance: {creditiorData?.balance}
              </div>
            </div>
            <div className='flex justify-center w-full'>
              <Input
                onChange={setAmount}
                placeholder='Enter amount...'
                value={amount}
                title='Amount'
                type='number'
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
