
import {
  Connection,
  Keypair,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import * as splToken from '@solana/spl-token'
import fs from 'fs'
import * as anchor from '@project-serum/anchor'

const sleep = (ms : number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export let programId = new PublicKey('BUKi6QtZa5mYpLCdKitVJWxpa4Xx9NAMWoHCXcgWQgTU')
let oraclePrice = new PublicKey('J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix')
const idl=JSON.parse(fs.readFileSync('src/solana_anchor.json','utf8'))

export async function initLending(
    conn : Connection,
    owner : Keypair,
    lending : Keypair,
    oracleProgram : PublicKey
    ){
    let wallet = new anchor.Wallet(owner)
    let provider = new anchor.Provider(conn,wallet,anchor.Provider.defaultOptions())
    const program = new anchor.Program(idl,programId,provider)
    try {
        await program.rpc.initLendingMarket(
            {
                accounts:{
                    lendingMarket : lending.publicKey,
                    authority : owner.publicKey,
                    oracleProgramId : oracleProgram,
                    systemProgram : anchor.web3.SystemProgram.programId,
                },
                signers: [owner, lending] 
            }
        )
    } catch(err) {
        console.log(err)
    }
    // const account = await program.account.lendingMarket.fetch(lending.publicKey)
    // console.log(account)
}

export async function makeReserve(
    conn : Connection,
    owner : Keypair,
    reserve : PublicKey,
    bump : number,
    lending : PublicKey,
    collateral_mint : PublicKey,
    liquidity_mint : PublicKey,
    ){
    let wallet = new anchor.Wallet(owner)
    let provider = new anchor.Provider(conn,wallet,anchor.Provider.defaultOptions())
    const program = new anchor.Program(idl,programId,provider)
    try {
        await program.rpc.makeReserve(
            new anchor.BN(bump),
            {
                accounts:{
                    reserve : reserve,
                    owner : owner.publicKey,
                    lendingMarket : lending,
                    collateralMint : collateral_mint,
                    liquidityMint : liquidity_mint,
                    systemProgram : anchor.web3.SystemProgram.programId,
                },
                signers: [owner] 
            }
        )
    } catch(err) {
        console.log(err)
    }
}

export async function initReserve(
    conn : Connection,
    owner : Keypair,
    oracle : PublicKey,
    reserve : PublicKey,
    lending : PublicKey,
    collateral_account : PublicKey,
    liquidity_account : PublicKey,
    max_borrow_rate_numerator : number,
    max_borrow_rate_denominator : number,
    liquidation_bonus : number,
    liquidation_threshold : number,
    penalty_numerator : number,
    penalty_denominator : number,
    lock_duration : number,
    team_wallet : PublicKey,
    ){
    let wallet = new anchor.Wallet(owner)
    let provider = new anchor.Provider(conn,wallet,anchor.Provider.defaultOptions())
    const program = new anchor.Program(idl,programId,provider)
    try {
        await program.rpc.initReserve(
            new anchor.BN(max_borrow_rate_numerator),
            new anchor.BN(max_borrow_rate_denominator),
            new anchor.BN(liquidation_bonus),
            new anchor.BN(liquidation_threshold),
            new anchor.BN(penalty_numerator),
            new anchor.BN(penalty_denominator),
            new anchor.BN(lock_duration),
            {
                accounts:{
                    reserve : reserve,
                    owner : owner.publicKey,
                    lendingMarket : lending,
                    collateralAccount : collateral_account,
                    liquidityAccount : liquidity_account,
                    oraclePrice : oracle,                    
                    teamWallet : team_wallet,
                },
                signers: [owner] 
            }
        )
    } catch(err) {
        console.log(err)
    }
    // const account = await program.account.reserve.fetch(reserve)
    // console.log(account)
}

export async function setMarketPrice(
    conn : Connection,
    owner : Keypair,
    reserve : PublicKey,
    collateral_price : number,
    collateral_decimals : number,
    ){
    let wallet = new anchor.Wallet(owner)
    let provider = new anchor.Provider(conn,wallet,anchor.Provider.defaultOptions())
    const program = new anchor.Program(idl,programId,provider)
    const reserveData = await program.account.reserve.fetch(reserve)

    try {
        await program.rpc.setMarketPrice(
            new anchor.BN(collateral_price),
            new anchor.BN(collateral_decimals),
            {
                accounts:{
                    owner : owner.publicKey,
                    lendingMarket : reserveData.lendingMarket,
                    reserve : reserve,
                    oraclePrice : reserveData.liquidityOracle,
                },
                signers: [owner] 
            }
        )
    } catch(err) {
        console.log(err)
    }
}

export async function reserveLiveControl(
    conn : Connection,
    owner : Keypair,
    reserve : PublicKey,
    live : boolean
    ){
    let wallet = new anchor.Wallet(owner)
    let provider = new anchor.Provider(conn,wallet,anchor.Provider.defaultOptions())
    const program = new anchor.Program(idl,programId,provider)
    const reserveData = await program.account.reserve.fetch(reserve)
    try {
        await program.rpc.reserveLiveControl(
            live,
            {
                accounts:{
                    reserve : reserve,
                    owner : owner.publicKey,
                    lendingMarket : reserveData.lendingMarket,
                },
                signers: [owner] 
            }
        )
    } catch(err) {
        console.log(err)
    }
}

export async function getReserveData(
    conn : Connection,
    reserveAddress : PublicKey,
    ){
    let wallet = new anchor.Wallet(Keypair.generate())
    let provider = new anchor.Provider(conn,wallet,anchor.Provider.defaultOptions())
    const program = new anchor.Program(idl,programId,provider)
    const reserve = await program.account.reserve.fetch(reserveAddress)
    console.log("--  Reserve   :   " + reserveAddress.toBase58() + "  --")
    console.log("Active status  :  "+(reserve.isLive ? "Active" : "Inactive"))
    console.log("lending market  :  "+ reserve.lendingMarket.toBase58())
    console.log("liquidityMint  :  "+reserve.liquidityMint.toBase58())
    console.log("liquidityMintDecimals  :  " + reserve.liquidityMintDecimals)
    console.log("liquidityAccount  :  "+reserve.liquidityAccount.toBase58())
    console.log("liquidityOracle  :  "+reserve.liquidityOracle.toBase58())
    console.log("collateralMint  :  "+reserve.collateralMint.toBase58())
    console.log("collateralMintDecimals  :  "+reserve.collateralMintDecimals)
    console.log("collateralAccount  :  "+reserve.collateralAccount.toBase58())
    console.log("totalLiquidity  :  "+reserve.totalLiquidity.toNumber())
    console.log("totalCollateral :  "+reserve.totalCollateral.toNumber())
    console.log("maxBorrowRate   :  "+(reserve.maxBorrowRateNumerator.toNumber()/reserve.maxBorrowRateDenominator.toNumber()))
    console.log("liquidityMarketPrice  :  " + (reserve.liquidityMarketPrice.toNumber()/Math.pow(10,reserve.liquidityMarketPriceDecimals)))
    console.log("collateralMarketPrice :  " + (reserve.collateralMarketPrice.toNumber()/Math.pow(10,reserve.collateralMarketPriceDecimals)))
    // console.log("liquidity : " + reserve.liquidityMarketPriceDecimals+ reserve.liquidityMarketPrice.toNumber())
    console.log("teamWallet  :  "+reserve.teamWallet.toBase58())
    console.log("penalty rate  :  "+reserve.penaltyNumerator.toNumber()/reserve.penaltyDenominator.toNumber())
    console.log("liquidationBonus  :  "+reserve.liquidationBonus)
    console.log("liquidationThreshold  :  "+reserve.liquidationThreshold)
    console.log("lockDuration  :  "+reserve.lockDuration.toNumber())
}

export async function initObligation(
    conn : Connection,
    bidder : Keypair,
    reserve : PublicKey,
    ){
    console.log("+ initObligation")
    let wallet = new anchor.Wallet(bidder)
    let provider = new anchor.Provider(conn,wallet,anchor.Provider.defaultOptions())
    let [obligation,bump] = await PublicKey.findProgramAddress([reserve.toBuffer(),bidder.publicKey.toBuffer()],programId)

    const program = new anchor.Program(idl,programId,provider)
    try{
        await program.rpc.initObligation(
            new anchor.BN(bump),
            {
                accounts:{
                   obligation : obligation,
                   owner : bidder.publicKey,
                   reserve : reserve,
                   systemProgram : anchor.web3.SystemProgram.programId,
                },
                signers: [bidder]
            }
        )
    } catch(err) {
        console.log(err)
    }
    console.log("- end")
    await sleep(1000)
    // const account = await program.account.obligation.fetch(obligation)
    // console.log(account)    
}

export async function depositCollateral(
    conn : Connection,
    bidder : Keypair,
    bidder_token : PublicKey,
    reserve : PublicKey,
    amount : number
    ){
    console.log("+ depositCollateral")
    let wallet = new anchor.Wallet(bidder)
    let provider = new anchor.Provider(conn,wallet,anchor.Provider.defaultOptions())
    const program = new anchor.Program(idl,programId,provider)
    let reserveData = await program.account.reserve.fetch(reserve)
    let [obligation,bump] = await PublicKey.findProgramAddress([reserve.toBuffer(),bidder.publicKey.toBuffer()],programId)
    try{
        await program.rpc.depositCollateral(
            new anchor.BN(amount),
            {
                accounts:{
                   owner : bidder.publicKey,
                   sourceCollateral : bidder_token,
                   destCollateral : reserveData.collateralAccount,
                   reserve : reserve,
                   obligation : obligation,
                   tokenProgram : splToken.TOKEN_PROGRAM_ID,
                },
                signers: [bidder]
            }
        )
    } catch(err) {
        console.log(err)
    }
    console.log("- end")
    await sleep(1000)    
}

export async function withdrawCollateral(
    conn : Connection,
    bidder : Keypair,
    bidder_token : PublicKey,
    reserve : PublicKey,
    amount : number,
    ){
    console.log("+ withdrawCollateral")
    let wallet = new anchor.Wallet(bidder)
    let provider = new anchor.Provider(conn,wallet,anchor.Provider.defaultOptions())
    const program = new anchor.Program(idl,programId,provider)
    let reserveData = await program.account.reserve.fetch(reserve)
    let [obligation,bump] = await PublicKey.findProgramAddress([reserve.toBuffer(),bidder.publicKey.toBuffer()],programId)
    try{
        await program.rpc.withdrawCollateral(
            new anchor.BN(amount),
            {
                accounts:{
                   owner : bidder.publicKey,
                   sourceCollateral : reserveData.collateralAccount,
                   destCollateral : bidder_token,
                   reserve : reserve,
                   obligation : obligation,
                   tokenProgram : splToken.TOKEN_PROGRAM_ID,
                },
                signers: [bidder]
            }
        )
    } catch(err) {
        console.log(err)
    }
    console.log("- end")
    await sleep(1000)    
}

export async function borrowLiquidity(
    conn : Connection,
    bidder : Keypair,
    bidder_token : PublicKey,
    reserve : PublicKey,
    amount : number,
    ){
    console.log("+ borrowLiquidity")
    let wallet = new anchor.Wallet(bidder)
    let provider = new anchor.Provider(conn,wallet,anchor.Provider.defaultOptions())
    const program = new anchor.Program(idl,programId,provider)
    let reserveData = await program.account.reserve.fetch(reserve)    
    let [obligation,bump] = await PublicKey.findProgramAddress([reserve.toBuffer(),bidder.publicKey.toBuffer()],programId)
    try{
        await program.rpc.borrowLiquidity(
            new anchor.BN(amount),
            {
                accounts:{
                   owner : bidder.publicKey,
                   sourceLiquidity : reserveData.liquidityAccount,
                   destLiquidity : bidder_token,
                   reserve : reserve,
                   obligation : obligation,
                   tokenProgram : splToken.TOKEN_PROGRAM_ID,
                },
                signers: [bidder]
            }
        )
    } catch(err) {
        console.log(err)
    }
    console.log("- end")
    await sleep(1000)    
}

export async function repayLiquidity(
    conn : Connection,
    bidder : Keypair,
    bidder_token : PublicKey,
    reserve : PublicKey,
    amount : number,
    ){
    console.log("+ repayLiquidity")
    let wallet = new anchor.Wallet(bidder)
    let provider = new anchor.Provider(conn,wallet,anchor.Provider.defaultOptions())
    const program = new anchor.Program(idl,programId,provider)
    let reserveData = await program.account.reserve.fetch(reserve)
    let [obligation,bump] = await PublicKey.findProgramAddress([reserve.toBuffer(),bidder.publicKey.toBuffer()],programId)
    try{
        await program.rpc.repayLiquidity(
            new anchor.BN(amount),
            {
                accounts:{
                   owner : bidder.publicKey,
                   sourceLiquidity : bidder_token,
                   destLiquidity : reserveData.liquidityAccount,
                   reserve : reserve,
                   obligation : obligation,
                   tokenProgram : splToken.TOKEN_PROGRAM_ID,
                },
                signers: [bidder]
            }
        )
    } catch(err) {
        console.log(err)
    }
    console.log("- end")
    await sleep(1000)    
}

export async function lockAsset(
    conn : Connection,
    bidder : Keypair,
    lock_account : Keypair,
    reserve : PublicKey,
    amount : number,
    ){
    console.log("+ lockAsset")
    let wallet = new anchor.Wallet(bidder)
    let provider = new anchor.Provider(conn,wallet,anchor.Provider.defaultOptions())
    const program = new anchor.Program(idl,programId,provider)
    let reserveData = await program.account.reserve.fetch(reserve)
    let [obligation,bump] = await PublicKey.findProgramAddress([reserve.toBuffer(),bidder.publicKey.toBuffer()],programId)
    
    try {
        await program.rpc.lockAsset(
            new anchor.BN(amount),
            {
                accounts:{
                    owner : bidder.publicKey,
                    lockAccount : lock_account.publicKey,
                    obligation : obligation,
                    reserve : reserve,
                    systemProgram : anchor.web3.SystemProgram.programId,
                    clockSysvar : SYSVAR_CLOCK_PUBKEY,
                },
                signers: [bidder,lock_account]
            }
        )
    } catch(err) {
        console.log(err)
    }
    console.log("- end")
    await sleep(1000) 
}

export async function unlockAsset(
    conn : Connection,
    bidder : Keypair,
    lock_account : PublicKey,
    ){
    console.log("+ unlockAsset")
    let wallet = new anchor.Wallet(bidder)
    let provider = new anchor.Provider(conn,wallet,anchor.Provider.defaultOptions())
    const program = new anchor.Program(idl,programId,provider)
    let lockAccountData = await program.account.lockAccount.fetch(lock_account)
    let obligationData = await program.account.obligation.fetch(lockAccountData.obligation)
    let reserveData = await program.account.reserve.fetch(obligationData.reserve)
    try {
        await program.rpc.unlockAsset(
            {
                accounts:{
                    owner : bidder.publicKey,
                    lockAccount : lock_account,
                    reserve : obligationData.reserve,
                    obligation : lockAccountData.obligation,
                    sourceCollateral : reserveData.collateralAccount,
                    teamWallet : reserveData.teamWallet,
                    tokenProgram : splToken.TOKEN_PROGRAM_ID,
                    clockSysvar : SYSVAR_CLOCK_PUBKEY,
                },
                signers: [bidder]
            }
        )
    } catch(err) {
        console.log(err)
    }
    console.log("- end")
    await sleep(1000) 
}

export async function getObligationData(
    conn : Connection,
    bidder : PublicKey,
    reserve : PublicKey,
    ){
    let wallet = new anchor.Wallet(Keypair.generate())
    let provider = new anchor.Provider(conn,wallet,anchor.Provider.defaultOptions())
    const program = new anchor.Program(idl,programId,provider)
    let [obligation,bump] = await PublicKey.findProgramAddress([reserve.toBuffer(),bidder.toBuffer()],programId)
    let reserveData = await program.account.reserve.fetch(reserve)
    let obligationData = await program.account.obligation.fetch(obligation)
    let lendValue = obligationData.inputAmount.toNumber() * reserveData.collateralMarketPrice.toNumber() / Math.pow(10,reserveData.collateralMarketPriceDecimals + reserveData.collateralMintDecimals)
    let borrowValue = obligationData.outputAmount.toNumber() * reserveData.liquidityMarketPrice.toNumber() / Math.pow(10,reserveData.liquidityMarketPriceDecimals + reserveData.liquidityMintDecimals)
    console.log("")
    console.log("------------- Obligation Data --------------")
    console.log("lending amount  ---  " + obligationData.inputAmount.toNumber() + "  :  $" + lendValue)
    console.log("borrow amount  ---  " + obligationData.outputAmount.toNumber() + "  :  $" + borrowValue)
    console.log("factor  ---  " + Math.round(borrowValue/lendValue*10000)/100)
    console.log("-------------------- End -------------------")
}