import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';

import store from '../../../store';
import { showPaymentModal } from '../../../reducers';
import { GlowCircle, ThemedFadeButton } from '../..';
import { WalletStatus } from '.';

interface FooterProps {
  walletStatus: WalletStatus;
}

// TODO: create method that checks against our program
function isWhitelisted(): boolean {
  return true;
}

export default function Footer({ walletStatus }: FooterProps): JSX.Element {
  const [status, setStatus] = useState<Array<string>>(['', '']);
  const { publicKey } = useWallet();

  useEffect(() => {
    if (!publicKey) {
      setStatus(['bg-yellow-500', 'Connect your wallet.']);
      return;
    }

    if (!isWhitelisted()) {
      setStatus(['bg-red-500', 'You are not whitelisted.']);
      return;
    }

    setStatus(['bg-green-500', 'You are whitelisted!']);
  }, [publicKey, walletStatus]);

  return (
    <div className='relative bottom-8'>
      <div className='flex justify-between'>
        <div className='flex justify-center items-center'>
          <GlowCircle color={status[0]} className='w-2 h-2 mr-2' />
          <p className='text-xs'>{status[1]}</p>
        </div>
        <div className='pl-8'>
          <ThemedFadeButton
            content='Enter'
            onClick={() => store.dispatch(showPaymentModal.toggle())}
            className='text-sm text-white py-1'
          />
        </div>
      </div>
    </div>
  );
}
