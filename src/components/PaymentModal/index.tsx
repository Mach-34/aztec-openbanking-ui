import { useEffect, useMemo, useRef, useState } from 'react';
import Modal, { ModalProps } from '../Modal';
import PaymentChecklist from '../PaymentChecklist';
import Input from '../Input';
import { CreditorData } from '../../utils/data';
import { prepareOpenbankingPayment } from './utils';
import Button from '../Button';
import { decodeProtectedHeader } from 'jose';
import { generateAztecInputs } from '@openbanking.nr/js-inputs';
import forge from 'node-forge';
import { useAztec } from '../../contexts/AztecContext';
import { toast } from 'react-toastify';
import { toUSDCDecimals } from '../../utils';

type PaymentModalProps = {
  creditiorData: CreditorData | null;
  message: string;
} & Omit<ModalProps, 'children' | 'title'>;

const { VITE_APP_SERVER_URL: SERVER_URL } = import.meta.env;

export default function PaymentModal({
  creditiorData,
  onClose,
  open,
  message,
}: PaymentModalProps): JSX.Element {
  const { escrowContract, setTokenBalance, wallet } = useAztec();
  const [amount, setAmount] = useState('');
  const [aztecProofData, setAztecProofData] = useState<any>({});
  const [claimingTokens, setClaimingTokens] = useState<boolean>(false);
  const [paymentFlowStep, setPaymentFlowStep] = useState<number>(-1);
  const popupRef = useRef<Window | null>(null);

  const authRevolut = async () => {
    if (!creditiorData) return;
    const paymentData = prepareOpenbankingPayment(creditiorData, amount);

    const POPUP_HEIGHT = 600;
    const POPUP_WIDTH = 600;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    // calculate position
    const left = (screenWidth - POPUP_WIDTH) / 2;
    const top = (screenHeight - POPUP_HEIGHT) / 2;

    // get auth url
    const res = await fetch(`${SERVER_URL}/api/initialize-payment`, {
      body: JSON.stringify(paymentData),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    const { authUrl } = await res.json();
    popupRef.current = window.open(
      authUrl,
      '_blank',
      `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},top=${top},left=${left}`
    );
  };

  const claimTokens = async () => {
    if (!aztecProofData || !escrowContract || !wallet) return;
    setClaimingTokens(true);
    try {
      setPaymentFlowStep(4);

      await escrowContract
        .withAccount(wallet)
        .methods.prove_payment_and_claim(aztecProofData)
        .send()
        .wait();

      setTokenBalance((prev) => ({
        ...prev,
        private: prev.private + toUSDCDecimals(5n),
      }));

      toast.success('Successfully claimed tokens');
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      toast.error('Error claiming tokens');
    } finally {
      setClaimingTokens(false);
    }
  };

  const prepareAztecProofData = async (payload: any, signature: string) => {
    const res = await fetch(`${SERVER_URL}/noir-inputs`, {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rawPayload: JSON.stringify(payload), signature }),
      method: 'POST',
    });
    const { inputs } = await res.json();
    const contractParams = {
      modulus_limbs: inputs.modulus_limbs,
      redc_limbs: inputs.redc_limbs,
      signature_limbs: inputs.signature_limbs,
      partial_hash_start: inputs.partial_hash_start,
      header_delimiter_index: inputs.header_delimiter_index,
      payload: inputs.payload.storage,
      payload_length: inputs.payload.len,
    };

    setAztecProofData(contractParams);
  };

  const paymentFlowData = useMemo(() => {
    if (paymentFlowStep >= 3) {
      return {
        action: () => claimTokens(),
        loading: claimingTokens,
        text: claimingTokens ? 'Claiming tokens' : 'Claim tokens on Aztec',
      };
    } else if (paymentFlowStep === 2) {
      return {
        action: () => null,
        loading: true,
        text: 'Confirming payment...',
      };
    } else if (paymentFlowStep === 1) {
      return {
        action: () => null,
        loading: true,
        text: 'Initiating Payment...',
      };
    } else if (paymentFlowStep === 0) {
      return {
        action: () => authRevolut(),
        loading: false,
        text: 'Authorize Revolut',
      };
    }
    return {
      action: () => setPaymentFlowStep(0),
      loading: false,
      text: 'Begin Payment Flow',
    };
  }, [claimingTokens, paymentFlowStep]);

  useEffect(() => {
    if (!message) return;
    const parsed = JSON.parse(message);
    if (parsed.message === 'Payment initiated') {
      const { jwsSignature, ...payload } = parsed.paymentResponse;
      prepareAztecProofData(payload, jwsSignature);
      setPaymentFlowStep(2);
      setTimeout(() => {
        setPaymentFlowStep(3);
      }, 2500);
    } else if (parsed.message === 'Authorization successful') {
      // close popup
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      setPaymentFlowStep(1);
    }
  }, [message]);

  useEffect(() => {
    setAmount('');
    setClaimingTokens(false);
    setPaymentFlowStep(-1);
  }, [open]);

  return (
    <Modal
      action={
        paymentFlowStep <= 3
          ? {
              loading: paymentFlowData.loading,
              onClick: () => amount && paymentFlowData.action(),
              text: paymentFlowData.text,
            }
          : undefined
      }
      height={paymentFlowStep > -1 ? 80 : 45}
      onClose={onClose}
      open={open}
      title={
        paymentFlowStep > -1
          ? `Sending $${amount} dollars to ${creditiorData?.name}`
          : `Prepare payment to ${creditiorData?.name}`
      }
    >
      <div className='flex justify-start w-full'>
        {paymentFlowStep > -1 ? (
          <PaymentChecklist
            currentStep={paymentFlowStep}
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
