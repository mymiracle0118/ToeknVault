interface GlowCircleProps {
  color: string;
  className?: string;
}

export default function GlowCircle({ color, className = '' }: GlowCircleProps): JSX.Element {
  className = `rounded-full ${color} ${className}`;
  return <div className={className} />;
}
