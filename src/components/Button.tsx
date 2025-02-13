import Loader from './Loader';

type ButtonProps = {
  onClick: () => void;
  loading?: boolean;
  text: string;
};

export default function Button({
  text,
  onClick,
  loading = false,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className='flex items-center gap-2'
    >
      {text}
      {loading && <Loader size={16} />}
    </button>
  );
}
