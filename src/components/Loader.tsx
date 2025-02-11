import { Loader2 } from 'lucide-react';

type LoaderProps = {
  size?: number;
};

export default function Loader({ size }: LoaderProps): JSX.Element {
  return (
    <div className='animate-spin'>
      <Loader2 size={size ?? 20} />
    </div>
  );
}
