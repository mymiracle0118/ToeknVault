import { FadeButton } from '.';

interface ThemedFadeButtonProps {
  content?: string;
  onClick?: any;
  className?: string;
}

export default function ThemedFadeButton({
  content = '',
  onClick = () => {},
  className = '',
}: ThemedFadeButtonProps): JSX.Element {
  className = `from-purple-themed to-green-themed text-black ${className}`;
  return <FadeButton content={content} onClick={onClick} className={className} />;
}
