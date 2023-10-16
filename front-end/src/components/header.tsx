import { Logo } from '../assets';
import { WalletConnect } from './wallet';

interface ButtonProps {
  to: string;
  onClick?: any;
  children?: JSX.Element;
  className?: string;
}

interface CenterButtonProps {
  to: string;
  content: string;
}

const Button = ({ to, onClick, children, className }: ButtonProps): JSX.Element => (
  <button onClick={onClick ?? null} className={className ?? ''}>
    <a href={to}>{children}</a>
  </button>
);

function CenterButton({ to, content }: CenterButtonProps): JSX.Element {
  return (
    <Button to={to}>
      <span className='px-2 text-sm hover:text-green-400 transition duration-300'>{content}</span>
    </Button>
  );
}

export default function Header(): JSX.Element {
  return (
    <nav className='bg-black'>
      <div className='flex items-center justify-between'>
        <Button to='/'>
          <Logo />
        </Button>
        <div className='hidden md:flex items-center space-x-1 text-gray-400'>
          <CenterButton to='/presale' content='PRESALE' />
          <CenterButton to='/lending' content='LENDING' />
          <CenterButton to='/staking' content='STAKING' />
          <CenterButton to='/incubation' content='INCUBATION' />
        </div>
        <div className='px-2'>
          <WalletConnect />
        </div>
      </div>
    </nav>
  );
}

//<ThemedFadeButton content='[Wallet Placeholder]' className='x-2' />
