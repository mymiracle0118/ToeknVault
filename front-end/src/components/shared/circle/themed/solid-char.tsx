import { CharCircle } from '..';

interface ThemedSolidCharCircleProps {
  char: string;
  className?: string;
}

export default function ThemedSolidCharCircle({ char, className = '' }: ThemedSolidCharCircleProps): JSX.Element {
  className = `w-8 h-8 bg-green-500 text-black ${className}`;
  return <CharCircle char={char} className={className} />;
}

