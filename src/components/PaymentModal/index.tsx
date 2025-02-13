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
  const [amount, setAmount] = useState('');
  const [aztecProofData, setAztecProofData] = useState<any>({});
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

  const prepareAztecProofData = (payload: any, signature: string) => {
    console.log('Payload: ', payload);
    console.log('signature: ', signature);
  };

  function base64UrlToHex(base64Url: string) {
    // Convert Base64 URL encoding to standard Base64
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    // Decode Base64 to a Uint8Array
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }

    // Convert Uint8Array to hex
    return Array.from(buffer)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  const parseSignature = async () => {
    const data = {
      Data: {
        DomesticPaymentId: '67ae53ba-8104-a6ea-b1de-35d4e6adf52c',
        Status: 'Pending',
        StatusUpdateDateTime: '2025-02-13T20:19:06.562261Z',
        CreationDateTime: '2025-02-13T20:19:06.562261Z',
        ConsentId: '222796d3-5e1d-4ff5-83ea-8f8cc62ac09c',
        Initiation: {
          RemittanceInformation: { Unstructured: 'Shipment fee' },
          DebtorAccount: {
            SchemeName: 'UK.OBIE.SortCodeAccountNumber',
            Identification: '04290940164373',
            Name: 'Acme Corporation',
          },
          EndToEndIdentification: 'E2E123',
          InstructionIdentification: 'ID412',
          CreditorAccount: {
            Name: 'Receiver Co.',
            SchemeName: 'UK.OBIE.SortCodeAccountNumber',
            Identification: '11223321325698',
          },
          InstructedAmount: { Amount: '2.50', Currency: 'GBP' },
        },
      },
      Links: {
        Self: 'https://sandbox-oba.revolut.com/domestic-payments/67ae53ba-8104-a6ea-b1de-35d4e6adf52c',
      },
      Meta: { TotalPages: 1 },
    };

    // get public key
    const signature =
      'eyJraWQiOiJvSjQwLUcxVklxbUU2eUhuYnA4S1E1Qmk2bXciLCJhbGciOiJQUzI1NiIsImNyaXQiOlsiYjY0IiwiaHR0cDovL29wZW5iYW5raW5nLm9yZy51ay9pYXQiLCJodHRwOi8vb3BlbmJhbmtpbmcub3JnLnVrL2lzcyIsImh0dHA6Ly9vcGVuYmFua2luZy5vcmcudWsvdGFuIl0sImh0dHA6Ly9vcGVuYmFua2luZy5vcmcudWsvaWF0IjoxNzM5NDc0NDQ5LCJiNjQiOmZhbHNlLCJodHRwOi8vb3BlbmJhbmtpbmcub3JnLnVrL3RhbiI6Im9wZW5iYW5raW5nLm9yZy51ayIsImh0dHA6Ly9vcGVuYmFua2luZy5vcmcudWsvaXNzIjoiMDAxNTgwMDAwMTAzVUF2QUFNIn0..SP4gvdKheTw7WAHd5Nuv3IUBtvdefLApen2AIlbt_IAsvWR4-5txwWvXTJvEpgqqCFIjL4CO0ThJNEwLC-5sDEq6dATUE_Wet7Z92GHEHjEgVHTLNpDLLxS4frFsaPtY4HnSVaXsCY6YF3gYq5LcN2LTONKpvJCteTOm1REQl9GFwuJjIw0GLz1VqO_bIx0r87Og0JgYIE_UdAkPyfkdtMC4yG2-IieFapm0Y1RnaKle39QTbe_BJB0sh9DehZzVdDCKeRg3eIgBlBLSrH33v9AxJC5G1mBLrhMi37blkHZhYrFth3EjwI8AIAZDJF3TPzlSGHtCnNE3Tdy3rmAC0g';
    const decodedSignature = decodeProtectedHeader(signature);
    const res = await fetch(`${SERVER_URL}/extract-public-key`, {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ signature }),
      method: 'POST',
    });
    const { publicKey } = await res.json();
    const { modulus_limbs, redc_limbs } = publicKey;
    // console.log('Modulus limbs: ', modulus_limbs);
    let sigBuf = signature
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    console.log('sigs', signature);
    // const signatureBuffer = Buffer.from(
    //   signature.split('.')[2],
    //   'base64url'
    // ).toString('hex');
    const encodedHeader = Buffer.from(JSON.stringify(decodedSignature))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const payload = `${encodedHeader}.${JSON.stringify(data)}`;
    const contractInputs = generateAztecInputs(
      payload,
      base64UrlToHex(signature),
      modulus_limbs,
      redc_limbs
    );
    console.log('Contract inputs: ', contractInputs);
  };

  const paymentFlowData = useMemo(() => {
    if (paymentFlowStep === 0) {
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
  }, [paymentFlowStep]);

  useEffect(() => {
    if (!message) return;
    const parsed = JSON.parse(message);
    if (parsed.message === 'Payment initiated') {
      const { jwsSignature, ...payload } = parsed.paymentResponse;
      prepareAztecProofData(payload, parsed.jwsSignature);
      setPaymentFlowStep(2);
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
    setPaymentFlowStep(-1);
  }, [open]);

  return (
    <Modal
      action={{
        loading: paymentFlowData.loading,
        onClick: () => amount && paymentFlowData.action(),
        text: paymentFlowData.text,
      }}
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
      <Button onClick={() => parseSignature()} text='Parse Signature' />
    </Modal>
  );
}
