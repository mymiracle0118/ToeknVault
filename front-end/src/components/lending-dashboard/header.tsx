import { Fragment, useRef, useState, useEffect } from 'react';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import * as anchor from '@project-serum/anchor';
import { useWallet } from '@solana/wallet-adapter-react';

let lended_items: any[] = [];
let borrow_items: any[] = [];
let lending_balance = 0;
let borrow_balance = 0;
let netApy = 0;

let wallet: any;

const programId = new PublicKey('32iuW19UUWYcZv3ADt9UyE3P9zKLHyajiK1W4cYJCv7j');
const lending = new PublicKey('AZdmGfSMB1Z7VLr71E6JqFLeEbRdzHMfkDJgwm9cZJkD');
const idl = require('./solana_anchor.json');
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
const RESERVE_SIZE = 8 + 1 + 32 + 32 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 1;
const randomOwner = Keypair.generate();

async function getAssociatedTokenAddress(mint: any, owner: any) {
  let [address] = await PublicKey.findProgramAddress(
    [owner.toBuffer(), splToken.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return address;
}

async function getObligationAddress(reserve: any, owner: any) {
  let [address, bump] = await PublicKey.findProgramAddress([reserve.toBuffer(), owner.toBuffer()], programId);
  return address;
}

async function loadData(callback: any) {
  let randomwallet = new anchor.Wallet(randomOwner);
  const provider = new anchor.Provider(conn, randomwallet, anchor.Provider.defaultOptions());
  const program = new anchor.Program(idl, programId, provider);
  const resp = await conn.getProgramAccounts(programId, {
    dataSlice: { length: 0, offset: 0 },
    filters: [{ dataSize: RESERVE_SIZE }, { memcmp: { offset: 9, bytes: lending.toBase58() } }],
  });
  lended_items.splice(0, lended_items.length);
  borrow_items.splice(0, borrow_items.length);
  lending_balance = 0;
  borrow_balance = 0;

  for (let i in resp) {
    const reserve_address = resp[i].pubkey;
    const reserve_data = await program.account.reserve.fetch(reserve_address);
    if (!reserve_data.useful) continue;

    let obligation_address = await getObligationAddress(reserve_address, wallet.publicKey);
    if ((await conn.getAccountInfo(obligation_address)) == null) continue;

    const obligation_data = await program.account.obligation.fetch(obligation_address);

    let reserveCollateralFactor =
      Math.round(
        (reserve_data.maxBorrowRateNumerator.words[0] / reserve_data.maxBorrowRateDenominator.words[0]) * 10000,
      ) / 100;

    let collateralTokenAddress = await getAssociatedTokenAddress(reserve_data.collateralMint, wallet.publicKey);
    let liquidityTokenAddress = await getAssociatedTokenAddress(reserve_data.liquidityMint, wallet.publicKey);

    let col = 0;
    if (await conn.getAccountInfo(collateralTokenAddress)) {
      let colBalance = (await conn.getTokenAccountBalance(collateralTokenAddress)).value as any;
      col = obligation_data.inputAmount.words[0] / Math.pow(10, colBalance.decimals);
    }
    let liq = 0;
    if (await conn.getAccountInfo(liquidityTokenAddress)) {
      let liqBalance = (await conn.getTokenAccountBalance(liquidityTokenAddress)).value as any;
      liq = obligation_data.outputAmount.words[0] / Math.pow(10, liqBalance.decimals);
    }
    lending_balance += liq;
    borrow_balance += col;
    lended_items.push({
      id: i,
      img: 'images/sol_icon.svg',
      asset: reserve_data.collateralMint.toBase58().substr(0, 5),
      apy: 0,
      balance: col,
      collateralFactor: reserveCollateralFactor,
    });
    borrow_items.push({
      id: i,
      img: 'images/sol_icon.svg',
      asset: reserve_data.liquidityMint.toBase58().substr(0, 5),
      apy: 0,
      balance: liq,
      limit: (col * reserveCollateralFactor) / 100.0,
    });
  }

  if (callback) callback();
}

let init = true;
export default function Header() {
  const [changed, setChange] = useState(true);

  const reRender = () => {
    setChange(!changed);
  };

  wallet = useWallet();

  useEffect(() => {
    if (init && wallet.connected) {
      init = false;
      loadData(reRender);
    }
  });

  return (
    <div>
      <div className='flex justify-between gap-10'>
        <div className='lended-part rounded-xl p-12 text-right'>
          <div className='flex justify-between title-font'>
            <div className='w-1/6 text-left'>LENDED</div>
            <div className='w-1/6'>APY</div>
            <div className='w-2/6'>BALANCE</div>
            <div className='w-2/6'>COLLATERAL</div>
          </div>
          {lended_items.map((item) => (
            <div className='flex justify-between content-font' key={item.id}>
              <div className='w-1/6 flex justify-first'>
                <img src={item.img} alt='sol' className='w-5' />
                <div className='ml-2'>{item.asset}</div>
              </div>
              <div className='w-1/6'>{item.apy}% </div>
              <div className='w-2/6'>{item.balance}</div>
              <div className='w-2/6'>{item.collateralFactor}%</div>
            </div>
          ))}
        </div>
        <div className='borrow-part rounded-xl p-12 text-right'>
          <div className='flex justify-between title-font'>
            <div className='w-1/6 text-left'>BORROWED</div>
            <div className='w-1/6'>APY</div>
            <div className='w-2/6'>BALANCE</div>
            <div className='w-2/6'>BORROW LIMIT</div>
          </div>
          {borrow_items.map((item) => (
            <div className='flex justify-between content-font' key={item.id}>
              <div className='w-1/6 flex justify-first'>
                <img src={item.img} alt='sol' className='w-5' />
                <div className='ml-2'>{item.asset}</div>
              </div>
              <div className='w-1/6'>{item.apy}%</div>
              <div className='w-2/6'>{item.balance}</div>
              <div className='w-2/6'>{item.limit}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
