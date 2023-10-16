interface FadeButtonProps {
  content?: string;
  onClick?: any;
  className?: string;
}

export default function FadeButton({ content = '', onClick = () => {}, className = '' }: FadeButtonProps): JSX.Element {
  className = `bg-gradient-to-r rounded px-4 py-2 ${className} `;
  return (
    <button type='button' onClick={onClick} className={className}>
      {content}
    </button>
  );
}
