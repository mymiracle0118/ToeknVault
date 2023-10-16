import { WalletStatus } from '.';
import CompletionDiagram from './completion-diagram';
import Footer from './footer';

interface ViewProps {
  className?: string;
}

export default function View({ className }: ViewProps): JSX.Element {
  return (
    <div className={className ?? ''}>
      <header className='text-left'>
        <h3 className='text-sm text-gray-500'>Overview</h3>
        <h1 className='text-xl font-bold'>Seeded Presale</h1>
      </header>
      <div className='py-8'>
        <CompletionDiagram />
      </div>
      <Footer walletStatus={WalletStatus.Connected} />
    </div>
  );
}
