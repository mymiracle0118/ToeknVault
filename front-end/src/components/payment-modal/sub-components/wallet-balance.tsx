import { useState } from 'react';
import { Header } from '.';

export default function WalletBalance(): JSX.Element {
  // TODO: pull from wallet
  const [balance, setBalance] = useState<number>(0);

  return (
    <div className='flex justify-between items-center'>
      <Header>AMOUNT</Header>
      <div className='flex text-sm'>
        <p className='pr-2'>Wallet Balance:</p>
        <p className='flex text-green-500'>{balance} USDC</p>
      </div>
    </div>
  );
}
