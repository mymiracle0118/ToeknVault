import { SystemProgram, Transaction, TransactionSignature } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair } from '@solana/web3.js';
import { useCallback } from 'react';
import { FadeButton } from '../..';
import { useNotify } from '.';

export default function SubmitButton(): JSX.Element {
  const { connection } = useConnection();
  const { publicKey: sender, sendTransaction } = useWallet();
  const notify = useNotify();

  // For testing
  const receiver = Keypair.generate().publicKey;
  const lamports = 1;

  const onClick = useCallback(async () => {
    if (!sender) {
      notify('error', 'Wallet not connected');
      return;
    }

    if (!receiver) {
      notify('error', 'Invalid receiver address');
      return;
    }

    let signature: TransactionSignature;
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: sender!,
          toPubkey: receiver!,
          lamports: lamports,
        }),
      );

      signature = await sendTransaction(transaction, connection);
      notify('info', 'Transaction sent');

      await connection.confirmTransaction(signature, 'processed');
      notify('success', 'Transaction successful');
    } catch (err: any) {
      notify('error', `Transaction failed: ${err?.message}`);
      return;
    }
  }, [sender, receiver, lamports, sendTransaction, connection, notify]);

  return (
    <FadeButton
      content='Send funds'
      onClick={onClick}
      className='w-full my-8 py-2 from-purple-themed to-green-themed text-white'
    />
  );
}
