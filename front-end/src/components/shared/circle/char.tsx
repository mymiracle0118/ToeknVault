interface CharCircleProps {
  char: string;
  className?: string;
}

export default function CharCircle({ char, className = '' }: CharCircleProps): JSX.Element {
  className = `rounded-full ${className}`;
  return (
    <div className={className}>
      <p className='relative justify-center text-center top-0.5'>{char}</p>
    </div>
  );
}
