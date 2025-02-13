import { Loader2 } from 'lucide-react';

type LoaderProps = {
  color?: string;
  size?: number;
};

export default function Loader({ color, size }: LoaderProps): JSX.Element {
  return (
    <div className='animate-spin'>
      <Loader2 color={color} size={size ?? 20} />
    </div>
  );
}
