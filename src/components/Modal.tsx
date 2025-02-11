import { ReactNode } from 'react';
import ReactModal from 'react-modal';

export type ModalProps = {
  bgColor?: string;
  children: ReactNode;
  height?: number;
  onClose: () => void;
  open: boolean;
  width?: number;
};
export default function Modal({
  bgColor,
  children,
  height,
  onClose,
  open,
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
        },
        content: {
          backgroundColor: bgColor ?? 'white',
          height: height ? `${height}vh` : '',
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          marginRight: '-50%',
          transform: 'translate(-50%, -50%)',
          width: width ? `${width}vw` : '',
        },
      }}
    >
      {children}
    </ReactModal>
  );
}
