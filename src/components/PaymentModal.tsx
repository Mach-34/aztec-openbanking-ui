import Loader from './Loader';
import Modal, { ModalProps } from './Modal';

type PaymentModalProps = {} & Omit<ModalProps, 'children'>;

export default function PaymentModal({
  onClose,
  open,
}: PaymentModalProps): JSX.Element {
  return (
    <Modal onClose={onClose} open={open} title='Payment initiated'>
      <div className='text-bold text-2xl'>Initiating Revolut Payment</div>
      <div className='flex justify-center pb-4 mt-10'>
        <Loader color='#913DE5' size={40} />
      </div>
    </Modal>
  );
}
