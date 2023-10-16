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
  clusterApiUrl,
} from "@solana/web3.js";
import * as bs58 from 'bs58'
import * as splToken from '@solana/spl-token'
import fs from 'fs'
import * as anchor from '@project-serum/anchor'
import * as lending_api from './lending_api'
import { program } from 'commander';
import log from 'loglevel';

program.version('0.0.1');
log.setLevel('info');

async function displayStates(conn : Connection,addresses : PublicKey[]){
    for(let i=0; i<addresses.length; i++){
        let amount = (await conn.getTokenAccountBalance(addresses[i])).value.amount
        console.log(addresses[i].toBase58() + " : " + amount);
    }
}

programCommand('init_lending')
    .option(
        '-c, --creator <string>',
        'Lending market creator keypair',
        '2pUVo4mVSnebLyLmMTHgPRNbk7rgZki77bsYgbsuuQX9585N4aKNXWJRpyc98qnpgRKRH2hzB8VVnqeffurW39F4'
    )
    .option(
        '-o, --oracle <string>',
        'Oracle program id',
        'gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s',
    )
    .action(async (directory,cmd) =>{
        const {env,creator,oracle} = cmd.opts()
        const conn = new Connection(clusterApiUrl(env))
        const creatorKeypair = Keypair.fromSecretKey(bs58.decode(creator))
        const oracleAddress = new PublicKey(oracle)
        const lending = Keypair.generate()
        await lending_api.initLending(conn,creatorKeypair,lending,oracleAddress)
        console.log("lending market    --   "+lending.publicKey.toBase58())
    })      

programCommand('init_reserve')
    .option(
        '-o, --owner <string>',
        'Lending market owner keypair',
        '2pUVo4mVSnebLyLmMTHgPRNbk7rgZki77bsYgbsuuQX9585N4aKNXWJRpyc98qnpgRKRH2hzB8VVnqeffurW39F4'
    )
    .option(
        '-op, --oracle <string>',
        'Oracle account',
        'J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix',
    )
    .option(
        '-tl, --lending <string>',
        'Token Lending market address',
    )
    .option(
        '-cm, --collateral-mint <string>',
        'collateral token mint address',
    )
    .option(
        '-lm, --liquidity-mint <string>',
        'liquidity token mint address',
    )
    .option(
        '-bn, --borrow-rate-numerator <number>',
        'Max borrow rate numerator',
        '75'
    )
    .option(
        '-bd, --borrow-rate-denominator <number>',
        'Max borrow rate denominator',
        '100'
    )
    .option(
        '-lb, --liquidation-bonus <number>',
        'liquidation bonus',
        '5'
    )
    .option(
        '-lt, --liquidation-threshold <number>',
        'liquidation threshold',
        '80'
    )
    .option(
        '-pn, --penalty-numerator <number>',
        'penalty numerator',
        '3'
    )
    .option(
        '-pd, --penalty-denominator <number>',
        'penalty denominator',
        '10'
    )
    .option(
        '-ld, --lock-duration <number>',
        'lock duration',
        '7776000'
    )
    .option(
        '-tw, --team-wallet <string>',
        'Team wallet getting unlocking fee'
    )
    .action(async (directory,cmd)=>{
        const {
            env,
            owner,
            oracle,
            lending,
            collateralMint,
            liquidityMint,
            borrowRateNumerator,
            borrowRateDenominator,
            liquidationBonus,
            liquidationThreshold,
            penaltyNumerator,
            penaltyDenominator,
            lockDuration,
            teamWallet,
        } = cmd.opts()
        const conn = new Connection(clusterApiUrl(env))
        const creatorKeypair = Keypair.fromSecretKey(bs58.decode(owner))
        const lendingAddress = new PublicKey(lending)
        const collateralMintAddress = new PublicKey(collateralMint)
        const liquidityMintAddress = new PublicKey(liquidityMint)
        const oracleAddress = new PublicKey(oracle)        
        let [reserve,bump] = await PublicKey.findProgramAddress(
            [lendingAddress.toBuffer(),collateralMintAddress.toBuffer(),liquidityMintAddress.toBuffer()],
            lending_api.programId
        )
        let collateral = new splToken.Token(conn,collateralMintAddress,splToken.TOKEN_PROGRAM_ID,creatorKeypair)
        let liquidity = new splToken.Token(conn,liquidityMintAddress,splToken.TOKEN_PROGRAM_ID,creatorKeypair)
        const collateralToken =await collateral.createAccount(reserve)
        const liquidityToken = await liquidity.createAccount(reserve)
        let teamWalletAddress : PublicKey;
        if(teamWallet == null) teamWalletAddress = await collateral.createAccount(creatorKeypair.publicKey)
        else teamWalletAddress = new PublicKey(teamWallet)

        // await lending_api.makeReserve(
        //     conn,creatorKeypair,
        //     reserve,bump,
        //     lendingAddress,
        //     collateralMintAddress,
        //     liquidityMintAddress,
        // )
        console.log("make end")
        await lending_api.initReserve(
            conn, creatorKeypair, oracleAddress, 
            reserve,
            lendingAddress, 
            collateralToken,
            liquidityToken,
            borrowRateNumerator,borrowRateDenominator,
            liquidationBonus,liquidationThreshold,
            penaltyNumerator,penaltyDenominator,
            lockDuration,
            teamWalletAddress,
        )
        console.log("reserve    --   "+reserve.toBase58())
    })

programCommand('get_reserve_address')
    .option(
        '-tl, --lending <string>',
        'Lending market address',
    )
    .option(
        '-cm, --collateral-mint <string>',
        'collateral token mint address',
    )
    .option(
        '-lm, --liquidity-mint <string>',
        'liquidity token mint address',
    )
    .action(async (directory,cmd)=>{
        const {env,lending,collateralMint,liquidityMint} = cmd.opts()
        const conn = new Connection(clusterApiUrl(env))
        const lendingAddress = new PublicKey(lending)
        const collateralMintAddress = new PublicKey(collateralMint)
        const liquidityMintAddress = new PublicKey(liquidityMint)
        let [reserve,bump] = await PublicKey.findProgramAddress(
            [lendingAddress.toBuffer(),collateralMintAddress.toBuffer(),liquidityMintAddress.toBuffer()],
            lending_api.programId
        )

        console.log("reserve address   ---  "+reserve.toBase58())
        console.log("bump   ---   " + bump)
    })

programCommand('set_market_price')
    .option(
        '-o, --owner <string>',
        'Lending market owner keypair',
        '2pUVo4mVSnebLyLmMTHgPRNbk7rgZki77bsYgbsuuQX9585N4aKNXWJRpyc98qnpgRKRH2hzB8VVnqeffurW39F4'
    )
    .option(
        '-r, --reserve <string>',
        'Reserve address',
    )
    .option(
        '-p, --price <number>',
        'asset price',
    )
    .option(
        '-d, --decimals <number>',
        'price decimals'
    )
    .action(async (directory,cmd)=>{
        const {
            env,owner,
            reserve,
            price,decimals
        }=cmd.opts()
        const conn = new Connection(clusterApiUrl(env))
        const ownerKeypair = Keypair.fromSecretKey(bs58.decode(owner))
        const reserveAddress = new PublicKey(reserve)
        await lending_api.setMarketPrice(conn,ownerKeypair,reserveAddress,price,decimals)
    })

programCommand('reserve_live_control')
    .option(
        '-o, --owner <string>',
        'Lending market owner keypair',
        '2pUVo4mVSnebLyLmMTHgPRNbk7rgZki77bsYgbsuuQX9585N4aKNXWJRpyc98qnpgRKRH2hzB8VVnqeffurW39F4'
    )
    .option(
        '-r, --reserve <string>',
        'Reserve address',
    )
    .option(
        '-a, --active <string>',
        'a : acitve, i : inactive',
        'a'
    )
    .action(async (directory, cmd)=>{
        const {
            env,owner,reserve,active
        } = cmd.opts()
        const conn = new Connection(clusterApiUrl(env))
        const ownerKeypair = Keypair.fromSecretKey(bs58.decode(owner))
        const reserveAddress = new PublicKey(reserve)
        await lending_api.reserveLiveControl(conn,ownerKeypair,reserveAddress,active=='a' ? true : false)
    })

programCommand('reserve_data')
    .option(
        '-r, --reserve <string>',
        'Reserve address'
    )
    .action(async(directory,cmd)=>{
        const {env,reserve} = cmd.opts()
        const conn = new Connection(clusterApiUrl(env))
        const reserveAddress = new PublicKey(reserve)
        await lending_api.getReserveData(conn,reserveAddress)
    })

function programCommand(name: string) {
  return program
    .command(name)
    .option(
      '-e, --env <string>',
      'Solana cluster env name',
      'devnet', //mainnet-beta, testnet, devnet
    )
    .option('-l, --log-level <string>', 'log level', setLogLevel);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setLogLevel(value : any, prev : any) {
  if (value === undefined || value === null) {
    return;
  }
  console.log('setting the log value to: ' + value);
  log.setLevel(value);
}

program.parse(process.argv)