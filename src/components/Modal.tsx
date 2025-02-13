import { X } from 'lucide-react';
import { ReactNode } from 'react';
import ReactModal from 'react-modal';
import Button from './Button';

export type ModalProps = {
  action?: { onClick: () => void; loading: boolean; text: string };
  bgColor?: string;
  children: ReactNode;
  height?: number;
  onClose: () => void;
  open: boolean;
  title: string;
  width?: number;
};
export default function Modal({
  action,
  bgColor,
  children,
  height,
  onClose,
  open,
  title,
  width,
}: ModalProps) {
  return (
    <ReactModal
      isOpen={open}
      onRequestClose={onClose}
      contentLabel='Openbanking Demo Modal'
      style={{
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out',
        },
        content: {
          backgroundColor: bgColor ?? '#242424',
          border: '2px solid #913DE5',
          display: 'flex',
          flexDirection: 'column',
          height: height ? `${height}vh` : '50vh',
          justifyContent: 'space-between',
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          marginRight: '-50%',
          transform: 'translate(-50%, -50%)',
          transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
          width: width ? `${width}vw` : '40vw',
        },
      }}
    >
      <div>
        <X
          className='cursor-pointer ml-auto'
          onClick={() => onClose()}
          size={24}
        />
        <div className='text-2xl'>{title}</div>
      </div>
      <div className='flex flex-col items-center'>{children}</div>
      {action ? (
        <div className='flex justify-end mt-10'>
          <Button
            loading={action.loading}
            onClick={() => action.onClick()}
            text={action.text}
          />
        </div>
      ) : (
        <div />
      )}
    </ReactModal>
  );
}
