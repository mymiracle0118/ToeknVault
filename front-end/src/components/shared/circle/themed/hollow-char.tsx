import { CharCircle } from '..';

interface ThemedHollowCharCircleProps {
  char: string;
  borderColor?: string;
  textColor?: string;
  className?: string;
}

export default function ThemedHollowCharCircle({
  char,
  borderColor = 'border-green-500',
  textColor = 'text-white',
  className = '',
}: ThemedHollowCharCircleProps): JSX.Element {
  className = `w-8 h-8 border-2 bg-tranparent ${borderColor} ${textColor} ${className}`;
  return <CharCircle char={char} className={className} />;
}
