import { Fragment, useRef, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  Connection,
  Keypair,
  Signer,
  PublicKey,
  Transaction,
  TransactionSignature,
  ConfirmOptions,
  sendAndConfirmRawTransaction,
  RpcResponseAndContext,
  SimulatedTransactionResponse,
  Commitment,
  LAMPORTS_PER_SOL,
  SYSVAR_CLOCK_PUBKEY
} from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import * as anchor from '@project-serum/anchor';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import CircularProgress from '@mui/material/CircularProgress';
import { getATAAddress } from '@saberhq/token-utils';
import moment from 'moment';
import useNotify from './notify';
import { Timer } from './timer';

let lend_assets: any[] = [];
let borrow_assets: any[] = [];

let reserve_address: PublicKey[] = [];
let reserve_arr: any[] = [];

let lended_items: any[] = [];
let borrow_items: any[] = [];
let locked_users: any[] = [];
let lending_balance = 0;
let borrow_balance = 0;
let netApy = 0;

let lendData = {
  idx: 0,
  asset: '',
  price: 0,
  walletBalance: 0,
  apy: 0,
  lendBalance: 0,
  collateralFactor: 0,
  decimals: 0,
  limit: 0,
  usedLimit: 0,
};

let borrowData = {
  idx: 0,
  asset: '',
  price: 0,
  walletBalance: 0,
  apy: 0,
  borrowBalance: 0,
  accruedInterest: 0,
  limit: 0,
  limitBalance: 0,
  decimals: 0,
  usedLimit: 0,
};

let selLockAccount = {
  idx : 0,
  img : '',
  address : new PublicKey(0),
  amount : 0,
  ended_at : 0,
  time_left : {days:0,hours:0,minutes:0,seconds:0},
  end_day : '',//{year:0,month:0,days:0,hours:0,minutes:0,seconds:0},
  obligation : new PublicKey(0),
  reserve : new PublicKey(0),
  sourceCollateral : new PublicKey(0),
  teamWallet : new PublicKey(0),
}

const programId = new PublicKey('BUKi6QtZa5mYpLCdKitVJWxpa4Xx9NAMWoHCXcgWQgTU');
const lending = new PublicKey('BGiDXMqaJHpRLoPEdw2jpzuCCmoxfaUuMn2bjDtxCZ6s');
const idl = require('./solana_anchor.json');
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
const RESERVE_SIZE = 8 + 1+32+32+1+32+32+32+1+32+8+8+8+8+16+1+16+1+32+8+8+1+1+8+1+20;
const LOCKACCOUNT_SIZE = 8 + 1+32+32+32+8+8+10;
const randomOwner = Keypair.generate();
let notify: any;
export async function getAssociateTokenAddress(mint: any, owner: any) {
  let [address] = await PublicKey.findProgramAddress(
    [owner.toBuffer(), splToken.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return address;
}

export async function getObligationAddress(reserve: any, owner: any) {
  let [address, bump] = await PublicKey.findProgramAddress([reserve.toBuffer(), owner.toBuffer()], programId);
  return address;
}

async function getObligationBump(reserve: any, owner: any) {
  let [address, bump] = await PublicKey.findProgramAddress([reserve.toBuffer(), owner.toBuffer()], programId);
  return bump;
}

async function getObligationData(obligation: PublicKey) {
  let wallet = new anchor.Wallet(randomOwner);
  const provider = new anchor.Provider(conn, wallet, anchor.Provider.defaultOptions());
  const program = new anchor.Program(idl, programId, provider);
  const obligation_data = await program.account.obligation.fetch(obligation);
  return obligation_data;
}

async function loadLending(callback: any, wallet: any) {
  // console.log(
  //   (
  //     await getAssociateTokenAddress(
  //       new PublicKey('4XBFV2npV8ModPvHtcdsXj2HPhyLE7roFf5qqcq5SWkE'),
  //       new PublicKey('HuGoAKeNHcb3fMyN2PaCeo3UkoosZ5buZJ6AmrNyJnZZ'),
  //     )
  //   ).toBase58(),
  // );

  const randomwallet = new anchor.Wallet(randomOwner);
  const provider = new anchor.Provider(conn, randomwallet, anchor.Provider.defaultOptions());
  const program = new anchor.Program(idl, programId, provider);
  const resp = await conn.getProgramAccounts(programId, {
    dataSlice: { length: 0, offset: 0 },
    filters: [{ dataSize: RESERVE_SIZE }, { memcmp: { offset: 9, bytes: lending.toBase58() } }],
  });
  lend_assets.splice(0, lend_assets.length);
  borrow_assets.splice(0, borrow_assets.length);
  reserve_arr.splice(0, reserve_arr.length);
  reserve_address.splice(0, reserve_address.length);
  lended_items.splice(0, lended_items.length);
  borrow_items.splice(0, borrow_items.length);
  lending_balance = 0;
  borrow_balance = 0;
  netApy = 0;
  for (let i in resp) {
    const reserve_data = await program.account.reserve.fetch(resp[i].pubkey);
    if(!reserve_data.isLive) continue;
    reserve_address.push(resp[i].pubkey);
    reserve_arr.push(reserve_data);
    // console.log(resp[i].pubkey.toBase58())
    let balanceCollateral = (await conn.getTokenAccountBalance(reserve_data.collateralAccount)).value as any;
    let totalCollateral =
      ((balanceCollateral.amount / Math.pow(10, balanceCollateral.decimals)) *
        reserve_data.collateralMarketPrice.toNumber()) /
      Math.pow(10, reserve_data.collateralMarketPriceDecimals);
    let walletBalance = 0;
    let decimals = 0;
    if (wallet) {
      let myTokenAccount = await getAssociateTokenAddress(reserve_data.collateralMint, wallet);
      // console.log(myTokenAccount.toBase58());
      if (await conn.getAccountInfo(myTokenAccount)) {
        let balanceToken = (await conn.getTokenAccountBalance(myTokenAccount)).value as any;
        walletBalance = balanceToken.amount / Math.pow(10, balanceToken.decimals);
        decimals = balanceToken.decimals;
      }
    }
    let config1 = {
      img: 'images/seeded_icon.svg',
      asset: 'SEEDED',
      liq: totalCollateral,
      reward: 0,
      balance: walletBalance,
      decimals: decimals,
    };
    lend_assets.push(config1);

    let balanceLiquidity = (await conn.getTokenAccountBalance(reserve_data.liquidityAccount)).value as any;

    let totalLiquidity =
      ((reserve_data.totalLiquidity.toNumber() / Math.pow(10, balanceLiquidity.decimals)) *
        reserve_data.liquidityMarketPrice.toNumber()) /
      Math.pow(10, reserve_data.liquidityMarketPriceDecimals);
    walletBalance = 0;
    decimals = 0;
    if (wallet) {
      let myTokenAccount = await getAssociateTokenAddress(reserve_data.liquidityMint, wallet);

      if (await conn.getAccountInfo(myTokenAccount)) {
        let balanceToken = (await conn.getTokenAccountBalance(myTokenAccount)).value as any;
        walletBalance = balanceToken.amount / Math.pow(10, balanceToken.decimals);
        decimals = balanceToken.decimals;
      }
    }
    let config2 = {
      img: 'images/sol_icon.svg',
      asset: 'SOL',
      liq: totalLiquidity,
      reward: 0,
      balance: walletBalance,
      decimals: decimals,
    };
    borrow_assets.push(config2);

    if (wallet == null) continue;

    let obligation_address = await getObligationAddress(resp[i].pubkey, wallet);
    if ((await conn.getAccountInfo(obligation_address)) == null) continue;
    const obligation_data = await program.account.obligation.fetch(obligation_address);
    let balCol =
      ((obligation_data.inputAmount.toNumber() / Math.pow(10, config1.decimals)) *
        reserve_data.collateralMarketPrice.toNumber()) /
      Math.pow(10, reserve_data.collateralMarketPriceDecimals);
    let balLiq =
      ((obligation_data.outputAmount.toNumber() / Math.pow(10, config2.decimals)) *
        reserve_data.liquidityMarketPrice.toNumber()) /
      Math.pow(10, reserve_data.liquidityMarketPriceDecimals);

    lending_balance += balCol;
    borrow_balance += balLiq;
    let collateralFactor =
      (reserve_data.maxBorrowRateNumerator.toNumber() / reserve_data.maxBorrowRateDenominator.toNumber()) * 100;
    lended_items.push({
      img: 'images/seeded_icon.svg',
      asset: 'SEEDED',
      apy: 0,
      balance: balCol,
      collateralFactor: collateralFactor,
    });
    borrow_items.push({
      img: 'images/sol_icon.svg',
      asset: 'SOL',
      apy: 0,
      balance: balLiq,
      borrowLimit: (balCol * collateralFactor) / 100,
    });
  }
  if(wallet){
    const resp2 = await conn.getProgramAccounts(programId,{
      dataSlice: { length: 0, offset: 0 },
      filters: [{ dataSize: LOCKACCOUNT_SIZE }, { memcmp: { offset : 9, bytes: wallet.toBase58()} }],
    })
    locked_users.splice(0,locked_users.length)
    let idx = 0
    for(let lockaccount of resp2){
      let lockAccountData = await program.account.lockAccount.fetch(lockaccount.pubkey)
      if(!lockAccountData.isLive || lockAccountData.amount == 0) continue;
      let obligationData = await program.account.obligation.fetch(lockAccountData.obligation)
      let reserveData = await program.account.reserve.fetch(obligationData.reserve)
      if(reserveData.lendingMarket.toBase58() != lending.toBase58()) continue;
      locked_users.push({
        id : idx,
        img: 'images/seeded_icon.svg',
        asset: 'SEEDED',
        address : lockaccount.pubkey,
        amount : lockAccountData.amount.toNumber()/Math.pow(10,reserveData.collateralMintDecimals),
        ended_at : lockAccountData.endedAt.toNumber(),
        end_day : getEndDay(lockAccountData.endedAt.toNumber()),
        time_left : timeToEnd(lockAccountData.endedAt.toNumber()),
        obligation : lockAccountData.obligation,
        reserve : obligationData.reserve,
      })
      idx++
    }  
  }
  if (callback != null) callback();
}

function getEndDay(stamp : number){
  let now = moment(stamp * 1000)
  return  now.year()+"/"+(now.month()+1)+"/"+now.days()+"      "+now.hours()+"/"+now.minutes()+"/"+now.seconds()
  // return {year : now.year(), month : now.month()+1, days : now.days(), hours : now.hours(), minutes : now.minutes(), seconds : now.seconds()}
}

// async function loadLockedData(wallet : any,callback : any) {
//   if(!wallet) 
//     return
//   const randomwallet = new anchor.Wallet(randomOwner);
//   const provider = new anchor.Provider(conn, randomwallet, anchor.Provider.defaultOptions());
//   const program = new anchor.Program(idl, programId, provider);
//   const resp = await conn.getProgramAccounts(programId,{
//     dataSlice: { length: 0, offset: 0 },
//     filters: [{ dataSize: LOCKACCOUNT_SIZE }, { memcmp: { offset : 9, bytes: wallet.toBase58()} }],
//   })
//   locked_users.splice(0,locked_users.length)
//   let idx = 0
//   for(let lockaccount of resp){
//     let lockAccountData = await program.account.lockAccount.fetch(lockaccount.pubkey)
//     let obligationData = await program.account.obligation.fetch(lockAccountData.obligation)
//     if(!lockAccountData.isLive) continue;
//     locked_users.push({
//       id : idx,
//       img: 'images/seeded_icon.svg',
//       asset: 'SEEDED',
//       address : lockaccount.pubkey,
//       amount : lockAccountData.amount,
//       ended_at : lockAccountData.endedAt,
//       obligation : lockAccountData.obligation,
//       reserve : obligationData.reserve,
//     })
//     idx++
//   }
//   if (callback != null) callback();
// }

async function getProvider(wallet: any) {
  const provider = new anchor.Provider(conn, wallet as any, anchor.Provider.defaultOptions());
  return provider;
}

async function prepareData(idx: number, wallet: any, callback: any) {
  let reserve = reserve_arr[idx];
  let reserveAddress = reserve_address[idx];
  lendData.idx = idx;

  lendData.collateralFactor =
    (reserve.maxBorrowRateNumerator.toNumber() / reserve.maxBorrowRateDenominator.toNumber()) * 100;
  let myTokenAccount = await getAssociateTokenAddress(reserve.collateralMint, wallet.publicKey);
  if (await conn.getAccountInfo(myTokenAccount)) {
    lendData.walletBalance = lend_assets[idx].balance ? lend_assets[idx].balance : 0;
  } else {
    lendData.walletBalance = 0;
  }
  lendData.decimals = lend_assets[idx].decimals;
  borrowData.decimals = borrow_assets[idx].decimals;
  let myObligationAccount = await getObligationAddress(reserveAddress, wallet.publicKey);
  if (await conn.getAccountInfo(myObligationAccount)) {
    let obligationData = await getObligationData(myObligationAccount);
    lendData.lendBalance = obligationData.inputAmount.toNumber() - obligationData.lockAmount.toNumber();
    lendData.lendBalance = lendData.lendBalance / Math.pow(10, lendData.decimals);
    borrowData.borrowBalance = obligationData.outputAmount.toNumber();
    borrowData.borrowBalance = borrowData.borrowBalance / Math.pow(10, borrowData.decimals);
  } else {
    lendData.lendBalance = 0;
    borrowData.borrowBalance = 0;
  }
  lendData.asset = lend_assets[idx].asset!=undefined ? lend_assets[idx].asset : '';
  if (reserve.collateralMarketPrice && reserve.collateralMarketPriceDecimals)
    lendData.price = reserve.collateralMarketPrice.toNumber() / Math.pow(10, reserve.collateralMarketPriceDecimals!);
  else lendData.price = 0;

  borrowData.idx = idx;
  myTokenAccount = await getAssociateTokenAddress(reserve.liquidityMint, wallet.publicKey);
  if (await conn.getAccountInfo(myTokenAccount)) {
    borrowData.walletBalance = borrow_assets[idx].balance ? borrow_assets[idx].balance : 0;
  } else {
    borrowData.walletBalance = 0;
  }
  borrowData.asset = borrow_assets[idx].asset ? borrow_assets[idx].asset : '';
  if (reserve.liquidityMarketPrice && reserve.liquidityMarketPriceDecimals)
    borrowData.price = reserve.liquidityMarketPrice.toNumber() / Math.pow(10, reserve.liquidityMarketPriceDecimals!);
  else borrowData.price = 0;

  lendData.limit =
    lendData.lendBalance * lendData.price -
    ((borrowData.borrowBalance * borrowData.price) / lendData.collateralFactor) * 100;

  borrowData.limit =
    (lendData.lendBalance * lendData.price * lendData.collateralFactor) / 100 -
    borrowData.borrowBalance * borrowData.price;

  borrowData.limitBalance = 0;
  if (borrowData.price != 0) borrowData.limitBalance = borrowData.limit / borrowData.price;

  lendData.usedLimit = 0;
  if (lendData.lendBalance != 0) {
    lendData.usedLimit = ((borrowData.borrowBalance * borrowData.price) / lendData.lendBalance / lendData.price) * 100;
  }
  borrowData.usedLimit = lendData.usedLimit;
  if (callback != null) callback();
}

async function createTokenAccount(mint: PublicKey, wallet: any) {
  let ata = await getAssociateTokenAddress(mint, wallet.publicKey);
  let transaction = new Transaction();
  transaction.add(
    await splToken.Token.createAssociatedTokenAccountInstruction(
      splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      splToken.TOKEN_PROGRAM_ID,
      mint,
      ata,
      wallet.publicKey,
      wallet.publicKey,
    ),
  );
  transaction.feePayer = wallet.publicKey;
  transaction.setSigners(wallet.publicKey);
  transaction.recentBlockhash = (await conn.getRecentBlockhash('max')).blockhash;
  const signedTransaction = await wallet.signTransaction(transaction);
  let hash = await conn.sendRawTransaction(signedTransaction.serialize());
  await conn.confirmTransaction(hash);
}

async function lendCollateral(wallet: any, amount: number, callback: any) {
  console.log('+ depositCollateral');
  let provider = await getProvider(wallet);
  const program = new anchor.Program(idl, programId, provider);
  amount = await Math.floor(amount * Math.pow(10, lendData.decimals));

  try {
    let idx = lendData.idx;
    let reserveAddress = reserve_address[idx];
    let reserve = reserve_arr[idx];

    let myTokenAccount = await getAssociateTokenAddress(reserve.collateralMint, wallet.publicKey);
    if ((await conn.getAccountInfo(myTokenAccount)) == null) {
      await createTokenAccount(reserve.collateralMint, wallet);
    }
    let myObligationAccount = await getObligationAddress(reserveAddress, wallet.publicKey);
    if ((await conn.getAccountInfo(myObligationAccount)) == null) {
      let bump = await getObligationBump(reserveAddress, wallet.publicKey);
      await program.rpc.initObligation(new anchor.BN(bump), {
        accounts: {
          obligation: myObligationAccount,
          owner: wallet.publicKey,
          reserve: reserveAddress,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
      });
    }
    await program.rpc.depositCollateral(new anchor.BN(amount), {
      accounts: {
        owner: wallet.publicKey,
        sourceCollateral: myTokenAccount,
        destCollateral: reserve.collateralAccount,
        reserve: reserveAddress,
        obligation: myObligationAccount,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
      },
    });
    notify('success', 'Successfully deposit!');
  } catch (err) {
    notify('error', 'Failed deposit!');
    console.log(err);
  }
  await loadLending(callback, wallet.publicKey);
}

async function withdrawCollateral(wallet: any, amount: number, callback: any) {
  console.log('+ withdrawCollateral');
  let provider = await getProvider(wallet);
  const program = new anchor.Program(idl, programId, provider);
  amount = await Math.floor(amount * Math.pow(10, lendData.decimals));
  try {
    let idx = lendData.idx;
    let reserveAddress = reserve_address[idx];
    let reserve = reserve_arr[idx];
    let myTokenAccount = await getAssociateTokenAddress(reserve.collateralMint, wallet.publicKey);
    if ((await conn.getAccountInfo(myTokenAccount)) == null) return;
    let myObligationAccount = await getObligationAddress(reserveAddress, wallet.publicKey);
    if ((await conn.getAccountInfo(myObligationAccount)) == null) return;

    await program.rpc.withdrawCollateral(new anchor.BN(amount), {
      accounts: {
        owner: wallet.publicKey,
        sourceCollateral: reserve.collateralAccount,
        destCollateral: myTokenAccount,
        reserve: reserveAddress,
        obligation: myObligationAccount,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
      },
    });
    notify('success', 'Successfully withdraw!');
  } catch (err) {
    notify('error', 'Failed withdraw!');
    console.log(err);
  }
  await loadLending(callback, wallet.publicKey);
}

async function borrowLiquidity(wallet: any, amount: number, callback: any) {
  console.log('+ borrowLiqudity');
  let provider = await getProvider(wallet);
  const program = new anchor.Program(idl, programId, provider);
  amount = await Math.floor(amount * Math.pow(10, borrowData.decimals));
  try {
    let idx = borrowData.idx;
    let reserveAddress = reserve_address[idx];
    let reserve = reserve_arr[idx];
    let myTokenAccount = await getAssociateTokenAddress(reserve.liquidityMint, wallet.publicKey);
    if ((await conn.getAccountInfo(myTokenAccount)) == null) {
      await createTokenAccount(reserve.liquidityMint, wallet);
    }
    let myObligationAccount = await getObligationAddress(reserveAddress, wallet.publicKey);
    if ((await conn.getAccountInfo(myObligationAccount)) == null) return;
    await program.rpc.borrowLiquidity(new anchor.BN(amount), {
      accounts: {
        owner: wallet.publicKey,
        sourceLiquidity: reserve.liquidityAccount,
        destLiquidity: myTokenAccount,
        reserve: reserveAddress,
        obligation: myObligationAccount,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
      },
    });
    notify('success', 'Successfully borrow!');
  } catch (err) {
    notify('error', 'Failed borrow!');
    console.log(err);
  }
  await loadLending(callback, wallet.publicKey);
}

async function repayLiquidity(wallet: any, amount: number, callback: any) {
  console.log('+ repayLiquidity');
  let provider = await getProvider(wallet);
  const program = new anchor.Program(idl, programId, provider);
  amount = await Math.floor(amount * Math.pow(10, borrowData.decimals));
  try {
    let idx = borrowData.idx;
    let reserveAddress = reserve_address[idx];
    let reserve = reserve_arr[idx];
    let myTokenAccount = await getAssociateTokenAddress(reserve.liquidityMint, wallet.publicKey);
    if ((await conn.getAccountInfo(myTokenAccount)) == null) return;
    let myObligationAccount = await getObligationAddress(reserveAddress, wallet.publicKey);
    if ((await conn.getAccountInfo(myObligationAccount)) == null) return;

    await program.rpc.repayLiquidity(new anchor.BN(amount), {
      accounts: {
        owner: wallet.publicKey,
        sourceLiquidity: myTokenAccount,
        destLiquidity: reserve.liquidityAccount,
        reserve: reserveAddress,
        obligation: myObligationAccount,
        tokenProgram: splToken.TOKEN_PROGRAM_ID,
      },
    });
    notify('success', 'Successfully repay!');
  } catch (err) {
    console.log(err);
    notify('error', 'Failed repay!');
  }
  await loadLending(callback, wallet.publicKey);
}

async function lockAsset(wallet : any, amount : number, callback : any) {
  console.log("+ lockAsset")
  let provider = await getProvider(wallet);
  const program = new anchor.Program(idl, programId, provider);
  amount = await Math.floor(amount * Math.pow(10, lendData.decimals));
  try {
    let lockAccount = Keypair.generate()
    let idx = borrowData.idx;
    let reserveAddress = reserve_address[idx];
    let myObligationAccount = await getObligationAddress(reserveAddress, wallet.publicKey);
    if ((await conn.getAccountInfo(myObligationAccount)) == null) return;
    await program.rpc.lockAsset(new anchor.BN(amount), 
      {
        accounts :{
          owner : wallet.publicKey,
          lockAccount : lockAccount.publicKey,
          obligation : myObligationAccount,
          reserve : reserveAddress,
          systemProgram : anchor.web3.SystemProgram.programId,
          clockSysvar : SYSVAR_CLOCK_PUBKEY,
        },
        signers : [lockAccount]
      }
    )
    notify('success', 'Successfully lock!')
  } catch(err) {
    console.log(err)
    notify('error', ' Failed lock asset!')
  }
  loadLending(callback,wallet.publicKey)
}

async function selectLockAccount(idx : number){
  let sel = locked_users[idx]
  const randomwallet = new anchor.Wallet(randomOwner);
  const provider = new anchor.Provider(conn, randomwallet, anchor.Provider.defaultOptions());
  const program = new anchor.Program(idl, programId, provider);
  const reserveData = await program.account.reserve.fetch(sel.reserve)
  selLockAccount={
    ...sel,
    sourceCollateral : reserveData.collateralAccount,
    teamWallet : reserveData.teamWallet,
  }
}

async function unlockAsset(wallet : any, callback : any) {
  console.log("+ unlockAsset")
  let provider = await getProvider(wallet)
  const program = new anchor.Program(idl, programId, provider)
  try {
    await program.rpc.unlockAsset({
      accounts : {
        owner : wallet.publicKey,
        lockAccount : selLockAccount.address,
        reserve : selLockAccount.reserve,
        obligation : selLockAccount.obligation,
        sourceCollateral : selLockAccount.sourceCollateral,
        teamWallet : selLockAccount.teamWallet,
        tokenProgram : splToken.TOKEN_PROGRAM_ID,
        clockSysvar : SYSVAR_CLOCK_PUBKEY,
      }
    })
    notify('success', 'Successfully unlock!')
  } catch(err) {
    console.log(err)
    notify('error', ' Failed unlock asset!')
  }
  loadLending(callback,wallet.publicKey)
}

function roundValue(val: number, positionPoint: number) {
  return Math.round(val * Math.pow(10, positionPoint)) / Math.pow(10, positionPoint);
}

function timeToEnd(endedAt : number){
  const now = moment().unix()
  const ended = {days : 0, hours : 0, minutes : 0, seconds : 0}
  let delta = endedAt - now
  if(delta<=0) return ended;
  const days = Math.floor(delta/86400)
  delta -= days*86400
  const hours = Math.floor(delta/3600)%24
  delta -= hours*3600
  const minutes = Math.floor(delta/60)%60
  delta -= minutes*60
  const seconds = Math.floor(delta%60)

  return {days,hours,minutes,seconds}
}

let init = true;
export default function Content() {
  const [lendopen, setLendOpen] = useState(false);
  const [borrowopen, setBorrowOpen] = useState(false);
  const [lockopen, setLockOpen] = useState(false);
  const [lendtabshow, setLendTabShow] = useState('lend');
  const [borrowtabshow, setBorrowTabShow] = useState('borrow');
  const [changed, setChange] = useState(true);
  const [amount1, setAmount1] = useState(0.0);
  const [amount2, setAmount2] = useState(0.0);
  const [amount3, setAmount3] = useState(0.0);
  const [amount4, setAmount4] = useState(0.0);
  const [validValue, setValidValue] = useState(false);
  const [progress, setProgress] = useState(0);
  const [assetlock , setAssetLock] = useState(false);
  const wallet = useWallet();
  // console.log(wallet.publicKey?.toBase58());

  notify = useNotify();
  const lendCancelButtonRef = useRef(null);
  const borrowCancelButtonRef = useRef(null);
  const lockCancelButtonRef = useRef(null);
  const changeValue1 = (event: any) => {
    if (event.target.value > lendData.walletBalance) {
      setAmount1(0);
      setValidValue(true);
    } else {
      setValidValue(false);
      setAmount1(event.target.value);
    }
  };

  const changeValue2 = (event: any) => {
    if (event.target.value > lendData.lendBalance) {
      setAmount2(0);
      setValidValue(true);
    } else {
      setValidValue(false);
      setAmount2(event.target.value);
    }
  };

  const changeValue3 = (event: any) => {
    if (event.target.value > borrowData.limitBalance) {
      setAmount3(0);
      setValidValue(true);
    } else {
      setValidValue(false);
      setAmount3(event.target.value);
    }
  };

  const changeValue4 = (event: any) => {
    if (event.target.value > borrowData.borrowBalance) {
      setAmount4(0);
      setValidValue(true);
    } else {
      setValidValue(false);
      setAmount4(event.target.value);
    }
  };

  const reRender = () => {
    setChange(!changed);
  };
  const lendModal = () => {
    setLendOpen(true);
  };
  const borrowModal = () => {
    setBorrowOpen(true);
  };
  const lockModal = () => {
    setLockOpen(true);
  };

  const changeCircle = () => {
    setProgress(99);
    if (wallet.publicKey != undefined) {
      loadLending(reRender, wallet.publicKey);
    }
  };

  if (wallet.publicKey != undefined && init) {
    init = false;
    loadLending(reRender, wallet.publicKey);
  }

  if (wallet.connected == false && init == false) {
    init = true;
    loadLending(reRender, null);
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prevProgress) => (prevProgress >= 100 ? 0 : prevProgress + 0.167));
    }, 1000);

    const timer1 = setInterval(() => {
      if (wallet.publicKey != undefined) {
        loadLending(reRender, wallet.publicKey);
      }
    }, 650000);

    return () => {
      clearInterval(timer);
      clearInterval(timer1);
    };
  }, []);

  return (
    <div className='z-10'>
      <div className='absolute circle mouse-cursor' onClick={() => changeCircle()}>
        <CircularProgress
          variant='determinate'
          value={100}
          sx={{
            color: '#313131',
          }}
          size={40}
          thickness={4}
          className='absolute right-0'
        />
        <CircularProgress
          variant='determinate'
          value={progress}
          sx={{
            color: '#0CF3A8',
          }}
          size={40}
          thickness={4}
        />
      </div>
      <div className='flex items-center justify-center -mt-8'>
        <img src={'images/circle.svg'} className='circle-width' alt='circle' />
      </div>
      <div className='top-layout'>
        <div className='net-color'>Net APY</div>
        <div className='percent-color'>{netApy}%</div>
      </div>
      <div className='flex justify-between title-layout'>
        <div className='l-bal text-left'>
          <span className='title-style'>Lend balance</span>
          <br />
          {wallet.connected ? (
            <span className='text-sm l-color'>${roundValue(lending_balance, 4)}</span>
          ) : (
            <span></span>
          )}
        </div>
        <div className='b-bal text-right'>
          <span className='title-style'>Borrow balance</span>
          <br />
          {wallet.connected ? <span className='text-sm b-color'>${roundValue(borrow_balance, 4)}</span> : <span></span>}
        </div>
      </div>
      <div className='bottom-layout'>
        <div className='dashboard-layout'>
          <div>
            <div className='flex justify-between gap-10'>
              <div className='lended-part rounded-xl p-12 text-right'>
                <div className='flex justify-between title-font'>
                  <div className='w-1/6 text-left'>LENDED</div>
                  <div className='w-1/6'>APY</div>
                  <div className='w-2/6'>BALANCE</div>
                  <div className='w-2/6'>COLLATERAL</div>
                </div>
                {lended_items.map((item, idx) => (
                  <div className='flex justify-between content-font' key={idx}>
                    <div className='w-1/6 flex justify-first'>
                      <img src={item.img} alt='sol' className='w-5' />
                      <div className='ml-2'>{item.asset}</div>
                    </div>
                    <div className='w-1/6'>{item.apy}% </div>
                    <div className='w-2/6'>${roundValue(item.balance, 4)}</div>
                    <div className='w-2/6'>{roundValue(item.collateralFactor, 4)}%</div>
                  </div>
                ))}
                <div className='flex justify-between title-font-lock'>
                  <div className='w-1/6 text-left'>LOCKED</div>
                  <div className='w-1/6'>Time left</div>
                  <div className='w-1/6'>AMOUNT</div>
                  <div className='w-1/6'>RESERVE</div>
                  <div className='w-2/6'></div>
                </div>
                {locked_users.map((item, idx) => (
                  <div className='flex justify-between items-center content-font' key={idx}>
                    <div className='w-1/6 flex justify-first'>
                      <img src={item.img} alt='sol' className='w-5' />
                      <div className='ml-2'>{item.asset}</div>
                    </div>
                    <div className='w-1/6'>{item.end_day}</div>
                    <div className='w-1/6'>{item.amount}</div>
                    <div className='w-1/6'>{item.reserve.toBase58().substr(0,5)}</div>
                    <div className='w-2/6'>
                      <button className='custom-button-lock' type='button' onClick={async () => {
                        await selectLockAccount(idx)
                        lockModal()
                      }}>
                        Unlock
                      </button>
                    </div>
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
                {borrow_items.map((item, idx) => (
                  <div className='flex justify-between content-font' key={idx}>
                    <div className='w-1/6 flex justify-first'>
                      <img src={item.img} alt='sol' className='w-5' />
                      <div className='ml-2'>{item.asset}</div>
                    </div>
                    <div className='w-1/6'>{item.apy}%</div>
                    <div className='w-2/6'>${roundValue(item.balance, 4)}</div>
                    <div className='w-2/6'>${roundValue(item.borrowLimit, 4)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className='mt-12'>
            <div className='flex justify-between gap-10'>
              <div className='asset-part rounded-xl text-right'>
                <div className='text-left mb-4 asset-title'>
                  <span className='text-xl'>Lend assets</span>
                </div>
                <div className='custom-border-bottom'></div>
                <div className='flex justify-between asset-title-font'>
                  <div className='w-2/12 text-left'>ASSET</div>
                  <div className='w-3/12'>LIQUIDITY</div>
                  <div className='w-3/12'>REWARD APY</div>
                  <div className='w-4/12'>IN BALANCE</div>
                </div>
                {lend_assets.map((item, idx) => (
                  <div className='asset-border' key={idx}>
                    <div
                      className='flex justify-between seeded-content-font'
                      onClick={() => {
                        if (wallet.connected) {
                          prepareData(idx, wallet, reRender);
                          lendModal();
                        }
                      }}>
                      <div className='w-2/12 flex justify-first'>
                        <img src={item.img} alt='sol' className='w-5' />
                        <div className='ml-2'>{item.asset}</div>
                      </div>
                      <div className='w-3/12'>${roundValue(item.liq, 4)}</div>
                      <div className='w-3/12'>{item.reward}%</div>
                      <div className='w-4/12'>
                        {roundValue(item.balance, 4)} {item.asset}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className='asset-part rounded-xl text-right'>
                <div className='text-left mb-4 asset-title'>
                  <span className='text-xl'>Borrow assets</span>
                </div>
                <div className='custom-border-bottom'></div>
                <div className='flex justify-between asset-title-font'>
                  <div className='w-2/12 text-left'> ASSET</div>
                  <div className='w-3/12'>BORROWED</div>
                  <div className='w-3/12'>REWARD APY</div>
                  <div className='w-4/12'>IN BALANCE</div>
                </div>
                {borrow_assets.map((item, idx) => (
                  <div className='asset-border' key={idx}>
                    <div
                      className='flex justify-between seeded-content-font'
                      onClick={() => {
                        if (wallet.connected) {
                          prepareData(idx, wallet, reRender);
                          borrowModal();
                        }
                      }}>
                      <div className='w-2/12 flex justify-first'>
                        <img src={item.img} alt='sol' className='w-5' />
                        <div className='ml-2'>{item.asset}</div>
                      </div>
                      <div className='w-3/12'>${roundValue(item.liq, 4)}</div>
                      <div className='w-3/12'>{item.reward}%</div>
                      <div className='w-4/12'>
                        {roundValue(item.balance, 4)} {item.asset}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Transition.Root show={lendopen} as={Fragment}>
              <Dialog
                as='div'
                className='fixed z-10 inset-0 overflow-y-auto'
                initialFocus={lendCancelButtonRef}
                onClose={setLendOpen}>
                <div className='flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
                  <Transition.Child
                    as={Fragment}
                    enter='ease-out duration-300'
                    enterFrom='opacity-0'
                    enterTo='opacity-100'
                    leave='ease-in duration-200'
                    leaveFrom='opacity-100'
                    leaveTo='opacity-0'>
                    <Dialog.Overlay className='fixed inset-0 bg-gray-700 bg-opacity-75 transition-opacity' />
                  </Transition.Child>

                  {/* This element is to trick the browser into centering the modal contents. */}
                  <span className='hidden sm:inline-block sm:align-middle sm:h-screen' aria-hidden='true'>
                    &#8203;
                  </span>
                  <Transition.Child
                    as={Fragment}
                    enter='ease-out duration-300'
                    enterFrom='opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'
                    enterTo='opacity-100 translate-y-0 sm:scale-100'
                    leave='ease-in duration-200'
                    leaveFrom='opacity-100 translate-y-0 sm:scale-100'
                    leaveTo='opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'>
                    <div className='inline-block align-bottom rounded-3xl overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full modal-body'>
                      <div className='flex justify-between py-4 px-9 custom-border-bottom'>
                        <div className={lendtabshow === 'lend' ? 'active-border-left' : 'active-border-right'}></div>
                        <div className='tab-lend text-base mouse-cursor' onClick={() => setLendTabShow('lend')}>
                          <span className={lendtabshow === 'lend' ? 'title-active' : ''}>Lend</span>
                        </div>
                        <div className='tab-withdraw text-base mouse-cursor' onClick={() => setLendTabShow('withdraw')}>
                          <span className={lendtabshow === 'withdraw' ? 'title-active' : ''}>Withdraw</span>
                        </div>
                      </div>
                      <div className={lendtabshow === 'lend' ? 'tab-show' : 'tab-hidden'}>
                        <div className='flex justify-between mb-4 mx-9 mt-9'>
                          <div className='modal-text'>AMOUNT</div>
                          <div className='modal-balance'>
                            <span>Wallet balance: </span>
                            <span className='unit-color'>
                              {roundValue(lendData.walletBalance, 4)} {lendData.asset}
                            </span>
                          </div>
                        </div>
                        <div className='flex justify-between my-2 mx-9'>
                          <input
                            type='text'
                            name='price'
                            id='price'
                            className='focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-4 custom-input text-right'
                            // value='45.01'
                            // disabled={true}
                            // value={amount}
                            onChange={changeValue1}
                            placeholder=' 0.00'
                          />
                          <div className='custom-i-right'>
                            <div className='mt-2.5 parent-text'>{lendData.asset}</div>
                            <div className='sub-text'>~${roundValue(amount1 * lendData.price, 4)}</div>
                          </div>
                        </div>
                        {validValue ? <div className='text-left my-2 mx-9 text-xs warning'>INCORRECT AMOUNT</div> : ''}
                        <div className='modal-text text-left mt-9 mx-9'>LENDING INFO</div>
                        <div className='flex justify-between mt-4 mx-9 text-xs'>
                          <div>Wallet balance</div>
                          <div>
                            {roundValue(lendData.walletBalance, 4)} {lendData.asset}
                          </div>
                        </div>
                        <div className='flex justify-between my-2 mx-9 text-xs'>
                          <div>APY</div>
                          <div>{lendData.apy}%</div>
                        </div>
                        <div className='flex justify-between my-2 mx-9 text-xs'>
                          <div>Lend balance</div>
                          <div>
                            {roundValue(lendData.lendBalance, 4)} {lendData.asset}
                          </div>
                        </div>
                        <div className='flex justify-between my-2 mx-9 text-xs'>
                          <div>Collateral factor</div>
                          <div>{roundValue(lendData.collateralFactor, 4)}%</div>
                        </div>
                        <div className='modal-text text-left mt-9 mx-9'></div>
                        <div className='modal-text text-left mt-9 mx-9'>TOKEN LOCKING</div>
                        <div className='flex justify-between mt-4 mx-9 text-xs'>
                          <div>Duration locked</div>
                          <div>90 days</div>
                        </div>
                        <div className='flex justify-start modal-text mt-9 mb-4 mx-9' onClick={()=>{
                          setAssetLock(!assetlock)
                        }}>
                          {assetlock ? <img className='w-3.5 mouse-cursor' src='images/locked.svg' alt='sol' />
                            : <img className='w-3.5 mouse-cursor' src='images/unlocked.svg' alt='sol' />}
                        <div className='ml-2'>{assetlock ? 'Lend my tokens' : 'Lock my tokens'}</div>
                        </div>
                        <div className='mt-2 mb-14 mx-9'>
                          <button
                            className='custom-button'
                            type='button'
                            onClick={async () => {
                              if(!assetlock)
                                await lendCollateral(wallet, amount1, reRender);
                              else
                                await lockAsset(wallet, amount1, reRender);
                              setAmount1(0);
                              setAssetLock(false);
                            }}>
                            {assetlock ? "Lock" : "Lend"}
                          </button>
                        </div>
                      </div>
                      <div className={lendtabshow === 'withdraw' ? 'tab-show' : 'tab-hidden'}>
                        <div className='flex justify-between mb-4 mx-9 mt-9'>
                          <div className='modal-text'>AMOUNT</div>
                          <div className='modal-balance'>
                            <span>Lend balance: </span>
                            <span className='unit-color'>
                              {roundValue(lendData.lendBalance, 7)} {lendData.asset}
                            </span>
                          </div>
                        </div>
                        <div className='flex justify-between my-2 mx-9'>
                          <input
                            type='text'
                            name='price'
                            id='price'
                            className='focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-4 custom-input text-right'
                            // value={amount}
                            onChange={changeValue2}
                            placeholder=' 0.00'
                          />
                          <div className='custom-i-right'>
                            <div className='mt-2.5 parent-text'>{lendData.asset}</div>
                            <div className='sub-text'>~${roundValue(amount2 * lendData.price, 4)}</div>
                          </div>
                        </div>
                        {validValue ? <div className='text-left my-2 mx-9 text-xs warning'>INCORRECT AMOUNT</div> : ''}
                        <div className='modal-text text-left mt-9 mx-9'>LENDING INFO</div>
                        <div className='flex justify-between mt-4 mx-9 text-xs'>
                          <div>Wallet balance</div>
                          <div>
                            {roundValue(lendData.walletBalance, 4)} {lendData.asset}
                          </div>
                        </div>
                        <div className='flex justify-between my-2 mx-9 text-xs'>
                          <div>APY</div>
                          <div>{lendData.apy}%</div>
                        </div>
                        <div className='flex justify-between my-2 mx-9 text-xs'>
                          <div>Lend balance</div>
                          <div>
                            {roundValue(lendData.lendBalance, 4)} {lendData.asset}
                          </div>
                        </div>
                        <div className='modal-text text-left mt-9 mx-9'>BORROW LIMIT</div>
                        <div className='flex justify-between mt-4 mx-9 text-xs'>
                          <div>Your limit</div>
                          <div>${roundValue(lendData.limit, 4)}</div>
                        </div>
                        <div className='flex justify-between mt-4 mx-9 text-xs'>
                          <div>Limit used</div>
                          <div>{roundValue(lendData.usedLimit, 4)}%</div>
                        </div>
                        <div className='mt-6 mb-14 mx-9'>
                          <button
                            className='custom-button'
                            type='button'
                            onClick={async () => {
                              await withdrawCollateral(wallet, amount2, reRender);
                              setAmount2(0);
                              setLendOpen(false);
                            }}>
                            Withdraw
                          </button>
                        </div>
                      </div>
                    </div>
                  </Transition.Child>
                </div>
              </Dialog>
            </Transition.Root>

            <Transition.Root show={borrowopen} as={Fragment}>
              <Dialog
                as='div'
                className='fixed z-10 inset-0 overflow-y-auto'
                initialFocus={borrowCancelButtonRef}
                onClose={setBorrowOpen}>
                <div className='flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
                  <Transition.Child
                    as={Fragment}
                    enter='ease-out duration-300'
                    enterFrom='opacity-0'
                    enterTo='opacity-100'
                    leave='ease-in duration-200'
                    leaveFrom='opacity-100'
                    leaveTo='opacity-0'>
                    <Dialog.Overlay className='fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity' />
                  </Transition.Child>

                  {/* This element is to trick the browser into centering the modal contents. */}
                  <span className='hidden sm:inline-block sm:align-middle sm:h-screen' aria-hidden='true'>
                    &#8203;
                  </span>
                  <Transition.Child
                    as={Fragment}
                    enter='ease-out duration-300'
                    enterFrom='opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'
                    enterTo='opacity-100 translate-y-0 sm:scale-100'
                    leave='ease-in duration-200'
                    leaveFrom='opacity-100 translate-y-0 sm:scale-100'
                    leaveTo='opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'>
                    <div className='inline-block align-bottom rounded-3xl overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full modal-body'>
                      <div className='flex justify-between py-4 px-9 custom-border-bottom'>
                        <div
                          className={
                            borrowtabshow === 'borrow' ? 'active-b-border-left' : 'active-b-border-right'
                          }></div>
                        <div className='tab-lend text-base mouse-cursor' onClick={() => setBorrowTabShow('borrow')}>
                          <span className={borrowtabshow === 'borrow' ? 'title-b-active' : ''}>Borrow</span>
                        </div>
                        <div className='tab-withdraw text-base mouse-cursor' onClick={() => setBorrowTabShow('repay')}>
                          <span className={borrowtabshow === 'repay' ? 'title-b-active' : ''}>Repay</span>
                        </div>
                      </div>
                      <div className={borrowtabshow === 'borrow' ? 'tab-show' : 'tab-hidden'}>
                        <div className='flex justify-between mb-4 mx-9 mt-9'>
                          <div className='modal-text'>AMOUNT</div>
                          <div className='modal-balance'>
                            <span>Borrow limit: </span>
                            {/* <span className='unit-color'>{Math.round(borrowData.limit * 100) / 100}</span> */}
                            <span className='unit-color'>
                              {roundValue(borrowData.limitBalance, 4)} {borrowData.asset}
                            </span>
                          </div>
                        </div>
                        <div className='flex justify-between my-2 mx-9'>
                          <input
                            type='text'
                            name='price'
                            id='price'
                            className='focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-4 custom-input text-right'
                            // value={amount}
                            onChange={changeValue3}
                            placeholder=' 0.00'
                          />
                          <div className='custom-i-right'>
                            <div className='mt-2.5 parent-text'>{borrowData.asset}</div>
                            <div className='sub-text'>~${Math.round(amount3 * borrowData.price * 100) / 100}</div>
                          </div>
                        </div>
                        {validValue ? <div className='text-left my-2 mx-9 text-xs warning'>INCORRECT AMOUNT</div> : ''}
                        <div className='modal-text text-left mt-9 mx-9'>BORROWING INFO</div>
                        <div className='flex justify-between mt-4 mx-9 text-xs'>
                          <div>APY</div>
                          <div>{borrowData.apy}%</div>
                        </div>
                        <div className='flex justify-between my-2 mx-9 text-xs'>
                          <div>Borrow balance</div>
                          <div>
                            {roundValue(borrowData.borrowBalance, 4)} {borrowData.asset}
                          </div>
                        </div>
                        <div className='flex justify-between my-2 mx-9 text-xs'>
                          <div>Accrued interest</div>
                          <div>{borrowData.accruedInterest}%</div>
                        </div>
                        <div className='modal-text text-left mt-9 mx-9'>BORROW LIMIT</div>
                        <div className='flex justify-between mt-4 mx-9 text-xs'>
                          <div>Your limit</div>
                          <div>${roundValue(borrowData.limit, 4)}</div>
                        </div>
                        <div className='flex justify-between mt-4 mx-9 text-xs'>
                          <div>Limit used</div>
                          <div>{roundValue(borrowData.usedLimit, 4)}%</div>
                        </div>
                        <div className='mt-4 mb-14 mx-9'>
                          <button
                            className='custom-button'
                            type='button'
                            onClick={async () => {
                              if (wallet.connected) {
                                await borrowLiquidity(wallet, amount3, reRender);
                                setAmount3(0);
                                setBorrowOpen(false);
                              }
                            }}>
                            Borrow
                          </button>
                        </div>
                      </div>
                      <div className={borrowtabshow === 'repay' ? 'tab-show' : 'tab-hidden'}>
                        <div className='flex justify-between mb-4 mx-9 mt-9'>
                          <div className='modal-text'>AMOUNT</div>
                          <div className='modal-balance'>
                            <span>Borrow balance: </span>
                            <span className='unit-color'>
                              {roundValue(borrowData.borrowBalance, 4)} {borrowData.asset}
                            </span>
                          </div>
                        </div>
                        <div className='flex justify-between my-2 mx-9'>
                          <input
                            type='text'
                            name='price'
                            id='price'
                            className='focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-4 custom-input text-right'
                            // value={amount}
                            onChange={changeValue4}
                            placeholder=' 0.00'
                          />
                          <div className='custom-i-right'>
                            <div className='mt-2.5 parent-text'>{borrowData.asset}</div>
                            <div className='sub-text'>~${roundValue(amount4 * borrowData.price, 4)}</div>
                          </div>
                        </div>
                        {validValue ? <div className='text-left my-2 mx-9 text-xs warning'>INCORRECT AMOUNT</div> : ''}
                        <div className='modal-text text-left mt-9 mx-9'>BORROWING INFO</div>
                        <div className='flex justify-between mt-4 mx-9 text-xs'>
                          <div>APY</div>
                          <div>{borrowData.apy}%</div>
                        </div>
                        <div className='flex justify-between my-2 mx-9 text-xs'>
                          <div>Borrow balance</div>
                          <div>
                            {roundValue(borrowData.borrowBalance, 4)} {borrowData.asset}
                          </div>
                        </div>
                        <div className='flex justify-between my-2 mx-9 text-xs'>
                          <div>Accrued interest</div>
                          <div>{borrowData.accruedInterest}%</div>
                        </div>
                        <div className='modal-text text-left mt-9 mx-9'>BORROW LIMIT</div>
                        <div className='flex justify-between mt-4 mx-9 text-xs'>
                          <div>Your limit</div>
                          <div>${roundValue(borrowData.limit, 4)}</div>
                        </div>
                        <div className='flex justify-between mt-4 mx-9 text-xs'>
                          <div>Limit used</div>
                          <div>{roundValue(borrowData.usedLimit, 4)}%</div>
                        </div>
                        <div className='mt-6 mb-14 mx-9'>
                          <button
                            className='custom-button'
                            type='button'
                            onClick={async () => {
                              if (wallet.connected) {
                                await repayLiquidity(wallet, amount4, reRender);
                                setAmount4(0);
                                setBorrowOpen(false);
                              }
                            }}>
                            Repay
                          </button>
                        </div>
                      </div>
                    </div>
                  </Transition.Child>
                </div>
              </Dialog>
            </Transition.Root>

            <Transition.Root show={lockopen} as={Fragment}>
              <Dialog
                as='div'
                className='fixed z-10 inset-0 overflow-y-auto'
                initialFocus={lockCancelButtonRef}
                onClose={setLockOpen}>
                <div className='flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
                  <Transition.Child
                    as={Fragment}
                    enter='ease-out duration-300'
                    enterFrom='opacity-0'
                    enterTo='opacity-100'
                    leave='ease-in duration-200'
                    leaveFrom='opacity-100'
                    leaveTo='opacity-0'>
                    <Dialog.Overlay className='fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity' />
                  </Transition.Child>

                  {/* This element is to trick the browser into centering the modal contents. */}
                  <span className='hidden sm:inline-block sm:align-middle sm:h-screen' aria-hidden='true'>
                    &#8203;
                  </span>
                  <Transition.Child
                    as={Fragment}
                    enter='ease-out duration-300'
                    enterFrom='opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'
                    enterTo='opacity-100 translate-y-0 sm:scale-100'
                    leave='ease-in duration-200'
                    leaveFrom='opacity-100 translate-y-0 sm:scale-100'
                    leaveTo='opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'>
                    <div className='inline-block align-bottom rounded-3xl overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full modal-body1 p-8'>
                      <div className='warning mt-8'>WARNING</div>
                      <div className='mt-6'>If you unlock your tokens before the end of the timer, <br/>it will cost you a 30% penalty.</div>
                      <div><Timer endedAt={selLockAccount.ended_at}/></div>
                      <div className='mt-6 mb-9'>
                        <button
                          className='custom-button1'
                          type='button'
                          onClick={async() => {
                            unlockAsset(wallet,reRender)
                            setLockOpen(false)
                          }}>
                          Unlock my tokens
                        </button>
                      </div>
                    </div>
                  </Transition.Child>
                </div>
              </Dialog>
            </Transition.Root>
          </div>
        </div>
      </div>
    </div>
  );
}
