import { JSX, useEffect, useState } from 'react';
import Modal, { ModalProps } from './Modal';
import Input from './Input';
import { Dropdown } from './Dropdown';
import { CurrencyCode } from '../utils/data';

type DepositModalProps = {
  onFinish: (
    sortCode: string,
    currencyCode: string,
    amount: number
  ) => Promise<void>;
} & Omit<ModalProps, 'children' | 'title'>;

export default function DepositModal({
  onClose,
  onFinish,
  open,
}: DepositModalProps): JSX.Element {
  const [amount, setAmount] = useState('');
  const [currencyCode, setCurrencyCode] = useState<string>('');
  const [depositing, setDepositing] = useState<boolean>(false);
  const [inputValidationError, setInputValidationError] =
    useState<boolean>(false);
  const [sortCode, setSortCode] = useState('');

  const onDeposit = async () => {
    if (validateInputs()) {
      setDepositing(true);
      try {
        await onFinish(sortCode, currencyCode, Number(amount));
        onClose();
      } catch {
      } finally {
        setDepositing(false);
      }
    }
  };

  const validateInputs = () => {
    if (/^\d{14}$/.test(sortCode)) {
      setInputValidationError(false);
      return true;
    } else {
      setInputValidationError(true);
      return false;
    }
  };

  useEffect(() => {
    setAmount('');
    setCurrencyCode('');
    setDepositing(false);
    setInputValidationError(false);
    setSortCode('');
  }, [open]);

  return (
    <Modal
      action={{
        onClick: () => onDeposit(),
        loading: depositing,
        text: depositing ? 'Despositing...' : 'Deposit',
      }}
      height={65}
      onClose={onClose}
      open={open}
      title='Create New Liquidity Position'
    >
      <div className='flex flex-col items-center gap-5 mx-auto w-3/4'>
        <Input
          className='w-full'
          error={
            inputValidationError
              ? 'Sort code must be exactly 14 numberic characters'
              : ''
          }
          onChange={setSortCode}
          placeholder='Enter sort code...'
          value={sortCode}
          title='Sort Code'
        />
        <Dropdown
          className='mr-auto'
          onSelect={() => null}
          options={[CurrencyCode.GBP]}
          selectedOption={CurrencyCode.GBP}
          title='Currency'
        />
        <Input
          className='w-full'
          error={inputValidationError && !amount ? 'Enter valid amount' : ''}
          onChange={setAmount}
          placeholder='Enter amount...'
          value={amount}
          title='Amount'
          type='number'
        />
      </div>
    </Modal>
  );
}
