pub mod utils;
use borsh::{BorshDeserialize};
use {
    crate::utils::*,
    anchor_lang::{
        prelude::*,
        solana_program::{
            program_pack::Pack,
            program_error::ProgramError,
            sysvar::{clock::Clock},
        },
        Key,
    },
    spl_token::state,
};
use bytemuck::{
    cast_slice,from_bytes,  try_cast_slice,
    Pod, PodCastError, Zeroable,
};
use std::mem::size_of;
use core::result::Result as OtherResult;
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

pub const LENDING_MARKET_SIZE : usize = 32+32+10;
pub const RESERVE_SIZE : usize = 1+32+32+1+32+32+32+1+32+8+8+8+8+16+1+16+1+32+8+8+1+1+8+1+20;
pub const OBLIGATION_SIZE : usize = 32+32+8+8+8+8+1+10;
pub const LOCKACCOUNT_SIZE : usize = 1+32+32+32+8+8+10;

#[program]
pub mod solana_anchor {
    use super::*;

    pub fn init_lending_market(
        ctx : Context<InitLendingMarket>,
        ) -> ProgramResult {
        msg!("Processing initialize_lending_market");
        let lending_market = &mut ctx.accounts.lending_market;
        lending_market.owner = ctx.accounts.authority.key();
        lending_market.oracle_program_id = *ctx.accounts.oracle_program_id.key;
        Ok(())
    }

    pub fn set_lending_market_owner(
        ctx : Context<SetLendingMarketOwner>,
        ) -> ProgramResult {
        let lending_market = &mut ctx.accounts.lending_market;
        lending_market.owner=*ctx.accounts.new_owner.key;
        Ok(())
    }

    pub fn make_reserve(
        ctx : Context<MakeReserveAccounts>,
        _bump : u8
        ) -> ProgramResult {
        msg!("Processing make_reserve");
        let reserve = &mut ctx.accounts.reserve;
        let liquidity_mint : state::Mint = state::Mint::unpack_from_slice(&ctx.accounts.liquidity_mint.data.borrow())?;
        let collateral_mint : state::Mint = state::Mint::unpack_from_slice(&ctx.accounts.collateral_mint.data.borrow())?;
        reserve.lending_market = ctx.accounts.lending_market.key();
        reserve.collateral_mint = *ctx.accounts.collateral_mint.key;
        reserve.liquidity_mint = *ctx.accounts.liquidity_mint.key;
        reserve.collateral_mint_decimals = collateral_mint.decimals;
        reserve.liquidity_mint_decimals = liquidity_mint.decimals;
        reserve.bump = _bump;
        Ok(())
    }

    pub fn init_reserve(
        ctx : Context<InitReserve>,
        _max_borrow_rate_numerator : u64,
        _max_borrow_rate_denominator : u64,
        _liquidation_bonus : u8,
        _liquidation_threshold : u8,
        _penalty_numerator : u64,
        _penalty_denominator : u64,
        _lock_duration : i64,
        ) -> ProgramResult {
        msg!("Processing init_reserve");
        let reserve_key = ctx.accounts.reserve.key();
        let reserve = &mut ctx.accounts.reserve;        
        let lending_market = &mut ctx.accounts.lending_market;
        let liquidity_account : state::Account = state::Account::unpack_from_slice(&ctx.accounts.liquidity_account.data.borrow())?;
        let collateral_account : state::Account = state::Account::unpack_from_slice(&ctx.accounts.collateral_account.data.borrow())?;
        let team_wallet : state::Account = state::Account::unpack_from_slice(&ctx.accounts.team_wallet.data.borrow())?;
        if team_wallet.mint != reserve.collateral_mint {
            return Err(LendingError::NotMatchCollateralMint.into());
        }
        if liquidity_account.mint != reserve.liquidity_mint {
            return Err(LendingError::NotMatchLiquidityMint.into());
        }
        if collateral_account.mint != reserve.collateral_mint {
            return Err(LendingError::NotMatchCollateralMint.into());
        }
        if lending_market.oracle_program_id != *ctx.accounts.oracle_price.owner {
            return Err(LendingError::InvalidOracleConfig.into());
        }
        if collateral_account.owner != reserve_key {
            return Err(LendingError::NotMatchCollateralAccount.into())
        }
        if liquidity_account.owner != reserve_key {
            return Err(LendingError::NotMatchLiquidityAccount.into())
        }
        if _liquidation_bonus >100 {
            return Err(LendingError::LiquidationBonusError.into())
        }

        reserve.liquidity_account = *ctx.accounts.liquidity_account.key;
        reserve.liquidity_oracle = *ctx.accounts.oracle_price.key;
        reserve.collateral_account = *ctx.accounts.collateral_account.key;
        reserve.max_borrow_rate_numerator = _max_borrow_rate_numerator;
        reserve.max_borrow_rate_denominator = _max_borrow_rate_denominator;
        reserve.total_liquidity = 0;
        reserve.total_collateral = 0;
        reserve.team_wallet = *ctx.accounts.team_wallet.key;
        reserve.penalty_numerator = _penalty_numerator;
        reserve.penalty_denominator = _penalty_denominator;
        reserve.is_live = false;
        reserve.liquidation_bonus = _liquidation_bonus;
        reserve.liquidation_threshold = _liquidation_threshold;
        reserve.lock_duration = _lock_duration;
        Ok(())
    }

    pub fn reserve_live_control(
        ctx : Context<ReserveLiveControl>,
        is_live : bool
        ) -> ProgramResult {
        let reserve = &mut ctx.accounts.reserve;
        if reserve.lending_market != ctx.accounts.lending_market.key() {
            return Err(LendingError::NotMatchLendingMarket.into());
        }
        reserve.is_live = is_live;
        Ok(())
    }

    pub fn init_obligation(
        ctx : Context<InitObligation>,
        _bump : u8,
        ) -> ProgramResult {
        let obligation = &mut ctx.accounts.obligation;
        obligation.owner = *ctx.accounts.owner.key;
        obligation.reserve = *ctx.accounts.reserve.key;
        obligation.input_amount = 0;
        obligation.output_amount = 0;
        obligation.lock_amount = 0;
        obligation.potential_amount = 0;
        obligation.bump = _bump;
        Ok(())
    }

    pub fn deposit_collateral(
        ctx : Context<DepositCollateral>,
        collateral_amount : u64,
        ) -> ProgramResult {
        let obligation = &mut ctx.accounts.obligation;        
        if obligation.reserve != ctx.accounts.reserve.key() {
            return Err(LendingError::NotMatchReserveAddress.into());
        }
        let reserve = &mut ctx.accounts.reserve;
        if reserve.collateral_account != *ctx.accounts.dest_collateral.key {
            return Err(LendingError::NotMatchCollateralAccount.into());
        }
        let source_collateral : state::Account = state::Account::unpack_from_slice(&ctx.accounts.source_collateral.data.borrow())?;
        let dest_collateral : state::Account = state::Account::unpack_from_slice(&ctx.accounts.dest_collateral.data.borrow())?;
        if source_collateral.mint != reserve.collateral_mint {
            return Err(LendingError::NotMatchCollateralMint.into());
        }
        if dest_collateral.mint != reserve.collateral_mint {
            return Err(LendingError::NotMatchLiquidityMint.into());
        }
        ////////////////////////////////////////////////////
        spl_token_transfer_without_seed(
            TokenTransferParamsWithoutSeed{
                source : ctx.accounts.source_collateral.clone(),
                destination : ctx.accounts.dest_collateral.clone(),
                authority : ctx.accounts.owner.clone(),
                token_program : ctx.accounts.token_program.clone(),
                amount : collateral_amount,
            }
        )?;
        obligation.input_amount= obligation.input_amount + collateral_amount;
        reserve.total_collateral = reserve.total_collateral + collateral_amount;
        Ok(())
    }

    pub fn withdraw_collateral(
        ctx : Context<WithdrawCollateral>,
        collateral_amount : u64,
        ) -> ProgramResult {
        let obligation = &mut ctx.accounts.obligation;
        let reserve_account_info = ctx.accounts.reserve.to_account_info().clone();        
        if obligation.reserve != ctx.accounts.reserve.key() {
            return Err(LendingError::NotMatchReserveAddress.into());
        }
        let reserve = &mut ctx.accounts.reserve;
        if !reserve.is_live {
            return Err(LendingError::ReserveNotAllowed.into());
        }
        if reserve.collateral_account != *ctx.accounts.source_collateral.key {
            return Err(LendingError::NotMatchCollateralAccount.into());
        }
        let source_collateral : state::Account = state::Account::unpack_from_slice(&ctx.accounts.source_collateral.data.borrow())?;
        let dest_collateral : state::Account = state::Account::unpack_from_slice(&ctx.accounts.dest_collateral.data.borrow())?;
        if source_collateral.mint != reserve.collateral_mint {
            return Err(LendingError::NotMatchCollateralMint.into());
        }
        if dest_collateral.mint != reserve.collateral_mint {
            return Err(LendingError::NotMatchLiquidityMint.into());
        }
        //Can I borrow?
        if collateral_amount > source_collateral.amount {
            return Err(LendingError::NotEnoughCollateral.into());
        }
        let real_amount = collateral_amount;
        let remainder = obligation.input_amount - obligation.lock_amount - obligation.potential_amount;
        if collateral_amount > (obligation.input_amount - obligation.lock_amount) {
            return Err(LendingError::InvalidLendAmount.into());
        }

        if (
            obligation.output_amount as u128
                * reserve.liquidity_market_price as u128 
                * reserve.max_borrow_rate_denominator as u128 
                / 10u128.pow((reserve.liquidity_mint_decimals + reserve.liquidity_market_price_decimals) as u32)
            )
            >
           (
            (obligation.input_amount - real_amount) as u128
                * reserve.collateral_market_price as u128
                * reserve.max_borrow_rate_numerator as u128 
                / 10u128.pow((reserve.collateral_mint_decimals + reserve.collateral_market_price_decimals) as u32)
            ) 
           {
            return Err(LendingError::InvalidBorrowRate.into());
        }

        let lending_seeds = &[
            reserve.lending_market.as_ref(),
            reserve.collateral_mint.as_ref(),
            reserve.liquidity_mint.as_ref(),
            &[reserve.bump]
        ];

        spl_token_transfer(
            TokenTransferParams{
                source : ctx.accounts.source_collateral.clone(),
                destination : ctx.accounts.dest_collateral.clone(),
                authority : reserve_account_info,
                token_program : ctx.accounts.token_program.clone(),
                authority_signer_seeds : lending_seeds,
                amount : real_amount,
            }
        )?;
        if real_amount > remainder {
            obligation.input_amount = obligation.input_amount - real_amount;
            obligation.potential_amount = obligation.potential_amount - (real_amount - remainder);
        } else {
            obligation.input_amount= obligation.input_amount - real_amount;
        }
        
        reserve.total_collateral = reserve.total_collateral - real_amount;
        Ok(())
    }

    pub fn borrow_liquidity(
        ctx : Context<BorrowLiquidity>,
        liquidity_amount : u64,
        ) -> ProgramResult {
        let reserve_account_info = ctx.accounts.reserve.to_account_info().clone(); 
        let obligation = &mut ctx.accounts.obligation;
        if obligation.reserve != ctx.accounts.reserve.key() {
            return Err(LendingError::NotMatchReserveAddress.into());
        }
        let reserve = &mut ctx.accounts.reserve;
        if !reserve.is_live {
            return Err(LendingError::ReserveNotAllowed.into());
        }
        if reserve.liquidity_account != *ctx.accounts.source_liquidity.key {
            return Err(LendingError::NotMatchLiquidityAccount.into());
        }
        let source_liquidity : state::Account = state::Account::unpack_from_slice(&ctx.accounts.source_liquidity.data.borrow())?;
        let dest_liquidity : state::Account = state::Account::unpack_from_slice(&ctx.accounts.dest_liquidity.data.borrow())?;
        if source_liquidity.mint != reserve.liquidity_mint {
            return Err(LendingError::NotMatchLiquidityMint.into());
        }
        if dest_liquidity.mint != reserve.liquidity_mint {
            return Err(LendingError::NotMatchLiquidityMint.into());
        }
        //Can I borrow?
        if liquidity_amount > source_liquidity.amount {
            return Err(LendingError::NotEnoughLiquidity.into());
        }

        if (
            (obligation.output_amount + liquidity_amount) as u128
                * reserve.liquidity_market_price as u128 
                * reserve.max_borrow_rate_denominator as u128 
                / 10u128.pow((reserve.liquidity_mint_decimals + reserve.liquidity_market_price_decimals) as u32)
            )
            >
           (
            obligation.input_amount as u128
                * reserve.collateral_market_price as u128
                * reserve.max_borrow_rate_numerator as u128 
                / 10u128.pow((reserve.collateral_mint_decimals + reserve.collateral_market_price_decimals) as u32)
            ) 
           {
            return Err(LendingError::InvalidBorrowRate.into());
        }

        let lending_seeds = &[
            reserve.lending_market.as_ref(),
            reserve.collateral_mint.as_ref(),
            reserve.liquidity_mint.as_ref(),
            &[reserve.bump]
        ];     

        spl_token_transfer(
            TokenTransferParams{
                source : ctx.accounts.source_liquidity.clone(),
                destination : ctx.accounts.dest_liquidity.clone(),
                authority : reserve_account_info,
                authority_signer_seeds : lending_seeds,
                token_program : ctx.accounts.token_program.clone(),
                amount : liquidity_amount,
            }
        )?;
        obligation.output_amount = obligation.output_amount + liquidity_amount;
        reserve.total_liquidity = reserve.total_liquidity + liquidity_amount;
        Ok(())
    }

    pub fn repay_liquidity(
        ctx : Context<RepayLiquidity>,
        liquidity_amount : u64,
        ) -> ProgramResult{
        let obligation = &mut ctx.accounts.obligation;
        if obligation.reserve != ctx.accounts.reserve.key() {
            return Err(LendingError::NotMatchReserveAddress.into());
        }
        let reserve = &mut ctx.accounts.reserve;
        if !reserve.is_live {
            return Err(LendingError::ReserveNotAllowed.into());
        }
        if reserve.liquidity_account != *ctx.accounts.dest_liquidity.key {
            return Err(LendingError::NotMatchLiquidityAccount.into());
        }
        let source_liquidity : state::Account = state::Account::unpack_from_slice(&ctx.accounts.source_liquidity.data.borrow())?;
        let dest_liquidity : state::Account = state::Account::unpack_from_slice(&ctx.accounts.dest_liquidity.data.borrow())?;
        if source_liquidity.mint != reserve.liquidity_mint {
            return Err(LendingError::NotMatchLiquidityMint.into());
        }
        if dest_liquidity.mint != reserve.liquidity_mint {
            return Err(LendingError::NotMatchLiquidityMint.into());
        }
        ///////////////////////////////////////////////        
        let mut real_amount : u64 = liquidity_amount;
        if real_amount > obligation.output_amount {
            real_amount = obligation.output_amount;
        }
        spl_token_transfer_without_seed(
            TokenTransferParamsWithoutSeed{
                source : ctx.accounts.source_liquidity.clone(),
                destination : ctx.accounts.dest_liquidity.clone(),
                authority : ctx.accounts.owner.clone(),
                token_program : ctx.accounts.token_program.clone(),
                amount : real_amount,
            }
        )?;
        obligation.output_amount = obligation.output_amount - real_amount;
        reserve.total_liquidity = reserve.total_liquidity - real_amount;
        Ok(())
    }

    pub fn redeem_reserve_collateral(
        ctx : Context<RedeemReserveCollateral>,
        _amount : u64,
        ) -> ProgramResult {
        let reserve_account_info = ctx.accounts.reserve.to_account_info().clone();
        let reserve = &mut ctx.accounts.reserve;
        if reserve.lending_market != ctx.accounts.lending_market.key() {
            return Err(LendingError::NotMatchLendingMarket.into());
        }
        if reserve.collateral_account != *ctx.accounts.source_collateral.key {
            return Err(LendingError::NotMatchCollateralAccount.into());
        }
        let source_collateral : state::Account = state::Account::unpack_from_slice(&ctx.accounts.source_collateral.data.borrow())?;
        let dest_collateral : state::Account = state::Account::unpack_from_slice(&ctx.accounts.dest_collateral.data.borrow())?;
        if source_collateral.mint != reserve.collateral_mint {
            return Err(LendingError::NotMatchCollateralMint.into());
        }
        if dest_collateral.mint != reserve.collateral_mint {
            return Err(LendingError::NotMatchCollateralMint.into());
        }
        if source_collateral.amount < _amount {
            return Err(LendingError::NotEnoughCollateral.into());
        }

        let lending_seeds = &[
            ctx.accounts.lending_market.to_account_info().key.as_ref(),
            reserve.collateral_mint.as_ref(),
            reserve.liquidity_mint.as_ref(),
            &[reserve.bump]
        ];
        spl_token_transfer(
            TokenTransferParams{
                source : ctx.accounts.source_collateral.clone(),
                destination : ctx.accounts.dest_collateral.clone(),
                authority : reserve_account_info,
                authority_signer_seeds : lending_seeds,
                token_program : ctx.accounts.token_program.clone(),
                amount : _amount,
            }
        )?;
        Ok(())
    }

    pub fn redeem_reserve_liquidity(
        ctx : Context<RedeemReserveLiquidity>,
        _amount : u64,
        ) -> ProgramResult {
        let reserve_account_info = ctx.accounts.reserve.to_account_info().clone();
        let reserve = &mut ctx.accounts.reserve;
        if reserve.lending_market != ctx.accounts.lending_market.key() {
            return Err(LendingError::NotMatchLendingMarket.into());
        }
        if reserve.liquidity_account != *ctx.accounts.source_liquidity.key {
            return Err(LendingError::NotMatchLiquidityAccount.into());
        }
        let source_liquidity : state::Account = state::Account::unpack_from_slice(&ctx.accounts.source_liquidity.data.borrow())?;
        let dest_liquidity : state::Account = state::Account::unpack_from_slice(&ctx.accounts.dest_liquidity.data.borrow())?;
        if source_liquidity.mint != reserve.liquidity_mint {
            return Err(LendingError::NotMatchLiquidityMint.into());
        }
        if dest_liquidity.mint != reserve.liquidity_mint {
            return Err(LendingError::NotMatchLiquidityMint.into());
        }
        if source_liquidity.amount < _amount {
            return Err(LendingError::NotEnoughLiquidity.into());
        }

        let lending_seeds = &[
            ctx.accounts.lending_market.to_account_info().key.as_ref(),
            reserve.collateral_mint.as_ref(),
            reserve.liquidity_mint.as_ref(),
            &[reserve.bump]
        ];
        spl_token_transfer(
            TokenTransferParams{
                source : ctx.accounts.source_liquidity.clone(),
                destination : ctx.accounts.dest_liquidity.clone(),
                authority : reserve_account_info,
                authority_signer_seeds : lending_seeds,
                token_program : ctx.accounts.token_program.clone(),
                amount : _amount,
            }
        )?;
        Ok(())
    }

    pub fn set_borrow_rate(
        ctx : Context<SetBorrowRate>,
        _borrow_rate_numerator : u64,
        _borrow_rate_denominator : u64
        ) -> ProgramResult {
        let reserve = &mut ctx.accounts.reserve;
        if reserve.lending_market != ctx.accounts.lending_market.key() {
            return Err(LendingError::NotMatchLendingMarket.into());
        }
        reserve.max_borrow_rate_numerator=_borrow_rate_numerator;
        reserve.max_borrow_rate_denominator=_borrow_rate_denominator;
        Ok(())
    }

    pub fn set_market_price(
        ctx : Context<SetMarketPrice>,
        _collateral_market_price : u128,
        _collateral_market_price_decimals : u8,
        ) -> ProgramResult {
        let reserve = &mut ctx.accounts.reserve;
        if reserve.lending_market != ctx.accounts.lending_market.key() {
            return Err(LendingError::NotMatchLendingMarket.into());
        }
        if reserve.liquidity_oracle != *ctx.accounts.oracle_price.key {
            return Err(LendingError::InvalidOracleConfig.into());
        }
        let pyth_price = ctx.accounts.oracle_price.try_borrow_data()?;
        let pa = load::<Price>(&pyth_price).map_err(|_| LendingError::InvalidPythPriceAccount)?;
        let maybe_price = pa.get_current_price();
        match maybe_price {
            Some((price,expo)) => {
                reserve.liquidity_market_price = price as u128;
                reserve.liquidity_market_price_decimals = (expo.abs()) as u8;
            }
            None => {
                return Err(LendingError::PythTrading.into());
            }
        }

        reserve.collateral_market_price = _collateral_market_price;
        reserve.collateral_market_price_decimals = _collateral_market_price_decimals;
        Ok(())
    }

    pub fn lock_asset(
        ctx : Context<LockAsset>,
        _amount : u64,
        ) -> ProgramResult {
        let clock = Clock::from_account_info(&ctx.accounts.clock_sysvar)?;
        let lock_account = &mut ctx.accounts.lock_account;
        let obligation_key = ctx.accounts.obligation.key();
        let obligation = &mut ctx.accounts.obligation;
        if obligation.reserve != ctx.accounts.reserve.key(){
            return Err(LendingError::NotMatchReserveAddress.into());
        }
        let reserve = &ctx.accounts.reserve;
        if _amount > obligation.input_amount-obligation.lock_amount {
            return Err(LendingError::NotEnoughCollateral.into());
        }
        if _amount == 0 {
            return Err(LendingError::NotAllowedToBeZero.into());
        }
        lock_account.owner =  *ctx.accounts.owner.key;
        lock_account.obligation = obligation_key;
        lock_account.amount = _amount;
        lock_account.ended_at = clock.unix_timestamp + reserve.lock_duration;
        obligation.lock_amount = obligation.lock_amount + _amount;
        lock_account.is_live = true;
        Ok(())
    }

    pub fn unlock_asset(
        ctx : Context<UnlockAsset>,
        ) -> ProgramResult {
        let clock = Clock::from_account_info(&ctx.accounts.clock_sysvar)?;

        let lock_account = &mut ctx.accounts.lock_account;
        if !lock_account.is_live {
            return Err(LendingError::InvalidLockState.into());
        }
        if lock_account.obligation != ctx.accounts.obligation.key() {
            return Err(LendingError::NotMatchObligation.into());
        }
        let obligation = &mut ctx.accounts.obligation;
        if obligation.reserve != ctx.accounts.reserve.key() {
            return Err(LendingError::NotMatchObligation.into());
        }
        let reserve_account_info = ctx.accounts.reserve.to_account_info().clone();
        let reserve = &mut ctx.accounts.reserve;
        if reserve.collateral_account != *ctx.accounts.source_collateral.key {
            return Err(LendingError::NotMatchCollateralAccount.into());
        }

        if lock_account.ended_at > clock.unix_timestamp {
            //////////////// Borrow Amount is valid? ////////////////
            let locked_amount = lock_account.amount;
            let team_amount = locked_amount * reserve.penalty_numerator / reserve.penalty_denominator;
            // let return_amount = locked_amount - return_amount;
            
            if (
                    (obligation.input_amount - team_amount)  as u128
                    * reserve.collateral_market_price as u128
                    * reserve.max_borrow_rate_numerator as u128 
                    / 10u128.pow((reserve.collateral_mint_decimals + reserve.collateral_market_price_decimals) as u32)
                )
                <
                (
                    obligation.output_amount as u128
                    * reserve.liquidity_market_price as u128 
                    * reserve.max_borrow_rate_denominator as u128 
                    / 10u128.pow((reserve.liquidity_mint_decimals + reserve.liquidity_market_price_decimals) as u32)
                ) {
                    return Err(LendingError::InvalidBorrowAmount.into());
            }
            
            let lending_seeds = &[
                reserve.lending_market.as_ref(),
                reserve.collateral_mint.as_ref(),
                reserve.liquidity_mint.as_ref(),
                &[reserve.bump]
            ];
            if team_amount != 0 {
                spl_token_transfer(
                    TokenTransferParams{
                        source : ctx.accounts.source_collateral.clone(),
                        destination : ctx.accounts.team_wallet.clone(),
                        authority : reserve_account_info,
                        authority_signer_seeds : lending_seeds,
                        token_program : ctx.accounts.token_program.clone(),
                        amount : team_amount,
                    }
                )?;
            }
            obligation.lock_amount = obligation.lock_amount - lock_account.amount;
            obligation.input_amount = obligation.input_amount - team_amount;
            reserve.total_collateral = reserve.total_collateral - team_amount;
            lock_account.amount = 0;
            lock_account.is_live = false;
        } else {
            obligation.lock_amount = obligation.lock_amount - lock_account.amount;
            obligation.potential_amount = obligation.potential_amount + lock_account.amount;
            lock_account.amount = 0;
            lock_account.is_live = false;
        }

        Ok(())
    }

    pub fn liquidation(
        ctx : Context<Liquidation>,
        ) -> ProgramResult {
        let obligation = &mut ctx.accounts.obligation;
        if obligation.reserve != ctx.accounts.reserve.key() {
            return Err(LendingError::NotMatchReserveAddress.into());
        }
        let reserve = &mut ctx.accounts.reserve;
        
        if reserve.liquidity_account != *ctx.accounts.dest_liquidity.key {
            return Err(LendingError::NotMatchLiquidityAccount.into());
        }

        let unhealty_borrow_amount = 
            obligation.input_amount as u128 
            * reserve.collateral_market_price as u128 
            / 10u128.pow((reserve.collateral_market_price_decimals+reserve.collateral_mint_decimals) as u32)
            * reserve.liquidation_threshold as u128 / 100u128;
        let borrow_amount = 
            obligation.output_amount as u128
            * reserve.liquidity_market_price as u128
            / 10u128.pow((reserve.liquidity_mint_decimals + reserve.liquidity_market_price_decimals) as u32);
        if unhealty_borrow_amount > borrow_amount {
            return Err(LendingError::InvalidLiquidationState.into());
        }

        let optimal_amount = 
            (obligation.input_amount as u128 
            * reserve.collateral_market_price as u128
            * 10u128.pow((reserve.liquidity_mint_decimals + reserve.liquidity_market_price_decimals) as u32)
            / reserve.liquidity_market_price as u128
            / 10u128.pow((reserve.collateral_market_price_decimals+reserve.collateral_mint_decimals) as u32)
            * reserve.max_borrow_rate_numerator as u128 / reserve.max_borrow_rate_denominator as u128) as u64;
        let source_liquidity : state::Account = state::Account::unpack_from_slice(&ctx.accounts.source_liquidity.data.borrow())?;
        let mut send_amount = obligation.output_amount - optimal_amount;
        if send_amount > source_liquidity.amount {
            send_amount = source_liquidity.amount
        }

        let added_lend_amount = 
            (send_amount as u128
            * reserve.liquidity_market_price as u128
            * 10u128.pow((reserve.collateral_market_price_decimals+reserve.collateral_mint_decimals) as u32)
            / reserve.collateral_market_price as u128
            / 10u128.pow((reserve.liquidity_mint_decimals + reserve.liquidity_market_price_decimals) as u32)
            * (100 + reserve.liquidation_bonus) as u128  / 100u128) as u64;

        spl_token_transfer_without_seed(
            TokenTransferParamsWithoutSeed{
                source : ctx.accounts.source_liquidity.clone(),
                destination : ctx.accounts.dest_liquidity.clone(),
                authority : ctx.accounts.owner.clone(),
                token_program : ctx.accounts.token_program.clone(),
                amount : send_amount,
            }
        )?;
        obligation.output_amount = obligation.output_amount - send_amount;
        obligation.input_amount = obligation.input_amount + added_lend_amount;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Liquidation<'info> {
    #[account(mut,signer)]
    owner : AccountInfo<'info>,

    #[account(mut)]
    reserve : ProgramAccount<'info,Reserve>,

    #[account(mut,has_one=owner)]
    obligation : ProgramAccount<'info,Obligation>,

    #[account(mut,owner=spl_token::id())]
    source_liquidity : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    dest_liquidity : AccountInfo<'info>,

    #[account(address=spl_token::id())]
    token_program : AccountInfo<'info>,    
}

#[derive(Accounts)]
pub struct LockAsset<'info> {
    #[account(mut,signer)]
    owner : AccountInfo<'info>,

    #[account(init, payer=owner, space=8+LOCKACCOUNT_SIZE)]
    lock_account : ProgramAccount<'info,LockAccount>,

    #[account(mut,has_one=owner)]
    obligation : ProgramAccount<'info,Obligation>,

    reserve : ProgramAccount<'info,Reserve>,

    system_program : Program<'info,System>,

    clock_sysvar : AccountInfo<'info>,   
}

#[derive(Accounts)]
pub struct UnlockAsset<'info> {
    #[account(mut,signer)]
    owner : AccountInfo<'info>,

    #[account(mut)]
    lock_account : ProgramAccount<'info,LockAccount>,

    #[account(mut,has_one=team_wallet)]
    reserve : ProgramAccount<'info,Reserve>,

    #[account(mut,seeds=[reserve.key().as_ref(),(*owner.key).as_ref()], bump=obligation.bump,has_one=owner)]
    obligation : ProgramAccount<'info,Obligation>,
    
    #[account(mut,owner=spl_token::id())]
    source_collateral : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    team_wallet : AccountInfo<'info>,

    #[account(address=spl_token::id())]
    token_program : AccountInfo<'info>,

    clock_sysvar : AccountInfo<'info>,    
}

#[derive(Accounts)]
pub struct SetMarketPrice<'info> {
    #[account(mut,signer)]
    owner : AccountInfo<'info>,

    #[account(has_one=owner)]
    lending_market : ProgramAccount<'info,LendingMarket>,

    #[account(mut)]
    reserve : ProgramAccount<'info,Reserve>,

    oracle_price : AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SetBorrowRate<'info> {
    #[account(mut,signer)]
    owner : AccountInfo<'info>,

    #[account(has_one=owner)]
    lending_market : ProgramAccount<'info,LendingMarket>,

    #[account(mut)]
    reserve : ProgramAccount<'info,Reserve>,
}

#[derive(Accounts)]
pub struct RedeemReserveLiquidity<'info> {
    #[account(mut,signer)]
    owner : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    source_liquidity : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    dest_liquidity : AccountInfo<'info>,

    #[account(mut)]
    reserve : ProgramAccount<'info,Reserve>,

    #[account(has_one=owner)]
    lending_market : ProgramAccount<'info,LendingMarket>,

    #[account(address=spl_token::id())]
    token_program : AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RedeemReserveCollateral<'info> {
    #[account(mut,signer)]
    owner : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    source_collateral : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    dest_collateral : AccountInfo<'info>,

    #[account(mut)]
    reserve : ProgramAccount<'info,Reserve>,

    #[account(has_one=owner)]
    lending_market : ProgramAccount<'info,LendingMarket>,

    #[account(address=spl_token::id())]
    token_program : AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RepayLiquidity<'info> {
    #[account(mut,signer)]
    owner : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    source_liquidity : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    dest_liquidity : AccountInfo<'info>,

    #[account(mut)]
    reserve : ProgramAccount<'info,Reserve>,

    #[account(mut,seeds=[reserve.key().as_ref(),(*owner.key).as_ref()], bump=obligation.bump,has_one=owner)]
    obligation : ProgramAccount<'info,Obligation>,

    #[account(address=spl_token::id())]
    token_program : AccountInfo<'info>,   
}

#[derive(Accounts)]
pub struct BorrowLiquidity<'info> {
    #[account(mut,signer)]
    owner : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    source_liquidity : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    dest_liquidity : AccountInfo<'info>,

    #[account(mut)]
    reserve : ProgramAccount<'info,Reserve>,

    #[account(mut,seeds=[reserve.key().as_ref(),(*owner.key).as_ref()], bump=obligation.bump,)]
    obligation : ProgramAccount<'info,Obligation>,

    #[account(address=spl_token::id())]
    token_program : AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawCollateral<'info> {
    #[account(mut,signer)]
    owner : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    source_collateral : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    dest_collateral : AccountInfo<'info>,

    #[account(mut)]
    reserve : ProgramAccount<'info,Reserve>,

    #[account(mut,seeds=[reserve.key().as_ref(),(*owner.key).as_ref()], bump=obligation.bump,has_one=owner)]
    obligation : ProgramAccount<'info,Obligation>,

    #[account(address=spl_token::id())]
    token_program : AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct DepositCollateral<'info> {
    #[account(mut,signer)]
    owner : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    source_collateral : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    dest_collateral : AccountInfo<'info>,

    #[account(mut)]
    reserve : ProgramAccount<'info,Reserve>,

    #[account(mut,seeds=[reserve.key().as_ref(),(*owner.key).as_ref()], bump=obligation.bump, has_one=owner)]
    obligation : ProgramAccount<'info,Obligation>,

    #[account(address=spl_token::id())]
    token_program : AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(_bump : u8)]
pub struct InitObligation<'info> {
    #[account(init, seeds=[reserve.key().as_ref(),(*owner.key).as_ref()], bump=_bump, payer=owner, space=8+OBLIGATION_SIZE)]
    obligation : ProgramAccount<'info,Obligation>,

    #[account(mut,signer)]
    owner : AccountInfo<'info>,

    reserve : AccountInfo<'info>,

    system_program : Program<'info,System>,
}

#[derive(Accounts)]
pub struct InitReserve<'info> {
    #[account(mut, seeds=[lending_market.key().as_ref(),(reserve.collateral_mint).as_ref(),(reserve.liquidity_mint).as_ref()],bump=reserve.bump)]
    reserve : ProgramAccount<'info,Reserve>,

    #[account(mut)]
    owner : Signer<'info>,

    #[account(mut,has_one=owner)]
    lending_market : ProgramAccount<'info,LendingMarket>,

    #[account(owner=spl_token::id())]
    collateral_account : AccountInfo<'info>,

    #[account(owner=spl_token::id())]
    liquidity_account : AccountInfo<'info>,

    oracle_price : AccountInfo<'info>,

    #[account(owner=spl_token::id())]
    team_wallet : AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(_bump : u8)]
pub struct MakeReserveAccounts<'info> {
    #[account(init, 
        seeds=[lending_market.key().as_ref(),(*collateral_mint.key).as_ref(),(*liquidity_mint.key).as_ref()],
        bump=_bump,
        payer=owner, space=8+RESERVE_SIZE)]
    reserve : ProgramAccount<'info,Reserve>,

    #[account(mut)]
    owner : Signer<'info>,

    #[account(mut,has_one=owner)]
    lending_market : ProgramAccount<'info,LendingMarket>,   

    #[account(owner=spl_token::id())]
    collateral_mint : AccountInfo<'info>,

    #[account(owner=spl_token::id())]
    liquidity_mint : AccountInfo<'info>,

    system_program : Program<'info,System>,
}

#[derive(Accounts)]
pub struct SetLendingMarketOwner<'info> {
    #[account(mut, has_one=owner)]
    lending_market : ProgramAccount<'info,LendingMarket>,

    #[account(mut, signer)]
    owner : AccountInfo<'info>,

    #[account(mut)]
    new_owner : AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ReserveLiveControl<'info> {
    #[account(mut)]
    reserve : ProgramAccount<'info,Reserve>,

    #[account(mut, signer)]
    owner : AccountInfo<'info>,

    #[account(mut,has_one=owner)]
    lending_market : ProgramAccount<'info,LendingMarket>,
}

#[derive(Accounts)]
pub struct InitLendingMarket<'info> {
    #[account(init, payer=authority, space=8+LENDING_MARKET_SIZE)]
    lending_market : ProgramAccount<'info,LendingMarket>,

    #[account(mut)]
    authority : Signer<'info>,

    oracle_program_id : AccountInfo<'info>,

    system_program : Program<'info,System>
}

#[account]
pub struct LendingMarket{
    pub owner : Pubkey,
    pub oracle_program_id : Pubkey,
}

#[account]
pub struct Reserve{
    pub is_live : bool,
    pub lending_market : Pubkey,
    pub liquidity_mint : Pubkey,
    pub liquidity_mint_decimals : u8,
    pub liquidity_account : Pubkey,
    pub liquidity_oracle : Pubkey,
    pub collateral_mint : Pubkey,
    pub collateral_mint_decimals : u8,
    pub collateral_account : Pubkey,
    pub total_liquidity : u64,
    pub total_collateral : u64,
    pub max_borrow_rate_numerator : u64,
    pub max_borrow_rate_denominator : u64,
    pub liquidity_market_price : u128,
    pub liquidity_market_price_decimals : u8,
    pub collateral_market_price : u128,
    pub collateral_market_price_decimals : u8,
    pub team_wallet : Pubkey,
    pub penalty_numerator : u64,
    pub penalty_denominator : u64,
    pub liquidation_bonus : u8,
    pub liquidation_threshold : u8,
    pub lock_duration : i64,
    pub bump : u8,
}

#[account]
pub struct Obligation{
    pub reserve : Pubkey,
    pub owner : Pubkey,
    pub input_amount : u64,
    pub output_amount : u64,
    pub lock_amount : u64,
    pub potential_amount : u64,
    pub bump : u8,
}

#[account]
pub struct LockAccount{
    pub is_live : bool,
    pub owner : Pubkey,
    pub obligation : Pubkey,
    pub amount : u64,
    pub ended_at : i64,
}

#[error]
pub enum LendingError {
    #[msg("Pyth product account provided is not owned by the lending market oracle program")]
    InvalidOracleConfig,

    #[msg("Pyth Trading")]
    PythTrading,

    #[msg("Invalid Pyth price account")]
    InvalidPythPriceAccount,

    #[msg("Math operation overflow")]
    MathOverflow,

    #[msg("Not match liquidity account")]
    NotMatchLiquidityAccount,

    #[msg("Not match liquidity mint")]
    NotMatchLiquidityMint,

    #[msg("Not match owner address")]
    NotMatchOwnerAddress,

    #[msg("Not match collateral mint")]
    NotMatchCollateralMint,

    #[msg("Not match collateral account")]
    NotMatchCollateralAccount,

    #[msg("Not match reserve address")]
    NotMatchReserveAddress,

    #[msg("Token transfer failed")]
    TokenTransferFailed,

    #[msg("Token set authority failed")]
    TokenSetAuthorityFailed,

    #[msg("Not enough liquidity")]
    NotEnoughLiquidity,

    #[msg("Invalid borrow rate")]
    InvalidBorrowRate,

    #[msg("Not enough collateral")]
    NotEnoughCollateral,

    #[msg("Not match lending market")]
    NotMatchLendingMarket,

    #[msg("Derived key invalid")]
    DerivedKeyInvalid,

    #[msg("Not match obligation")]
    NotMatchObligation,

    #[msg("Invalid lock state")]
    InvalidLockState,

    #[msg("Invalid borrow amount")]
    InvalidBorrowAmount,

    #[msg("Reserve not allowed")]
    ReserveNotAllowed,

    #[msg("Liquidation bonus error")]
    LiquidationBonusError,

    #[msg("Invalid lilquidation state")]
    InvalidLiquidationState,

    #[msg("Not allowed to be zero")]
    NotAllowedToBeZero,

    #[msg("Invalid lend amount")]
    InvalidLendAmount,
}

pub const MAGIC          : u32   = 0xa1b2c3d4;
pub const VERSION_2      : u32   = 2;
pub const VERSION        : u32   = VERSION_2;
pub const MAP_TABLE_SIZE : usize = 640;
pub const PROD_ACCT_SIZE : usize = 512;
pub const PROD_HDR_SIZE  : usize = 48;
pub const PROD_ATTR_SIZE : usize = PROD_ACCT_SIZE - PROD_HDR_SIZE;

#[derive(Copy, Clone)]
#[repr(C)]
pub enum AccountType
{
  Unknown,
  Mapping,
  Product,
  Price
}

#[derive(Copy, Clone)]
#[repr(C)]
pub enum PriceStatus
{
  Unknown,
  Trading,
  Halted,
  Auction
}

#[derive(Copy, Clone)]
#[repr(C)]
pub enum CorpAction
{
  NoCorpAct
}

#[derive(Copy, Clone)]
#[repr(C)]
pub enum PriceType
{
  Unknown,
  Price
}

#[derive(Copy, Clone)]
#[repr(C)]
pub struct AccKey
{
  pub val: [u8;32]
}

#[derive(Copy, Clone)]
#[repr(C)]
pub struct Product
{
  pub magic      : u32,        // pyth magic number
  pub ver        : u32,        // program version
  pub atype      : u32,        // account type
  pub size       : u32,        // price account size
  pub px_acc     : AccKey,     // first price account in list
  pub attr       : [u8;PROD_ATTR_SIZE] // key/value pairs of reference attr.
}

#[derive(Copy, Clone)]
#[repr(C)]
pub struct PriceInfo
{
  pub price      : i64,        // product price
  pub conf       : u64,        // confidence interval of product price
  pub status     : PriceStatus,// status of price (Trading is valid)
  pub corp_act   : CorpAction, // notification of any corporate action
  pub pub_slot   : u64
}

#[derive(Copy, Clone)]
#[repr(C)]
pub struct PriceComp
{
  pub publisher  : AccKey,     // key of contributing quoter
  pub agg        : PriceInfo,  // contributing price to last aggregate
  pub latest     : PriceInfo   // latest contributing price (not in agg.)
}

#[derive(Copy, Clone)]
#[repr(C)]
pub struct Ema
{
  pub val        : i64,        // current value of ema
  numer          : i64,        // numerator state for next update
  denom          : i64         // denominator state for next update
}

#[derive(Copy, Clone)]
#[repr(C)]
pub struct Price
{
  pub magic      : u32,        // pyth magic number
  pub ver        : u32,        // program version
  pub atype      : u32,        // account type
  pub size       : u32,        // price account size
  pub ptype      : PriceType,  // price or calculation type
  pub expo       : i32,        // price exponent
  pub num        : u32,        // number of component prices
  pub num_qt     : u32,        // number of quoters that make up aggregate
  pub last_slot  : u64,        // slot of last valid (not unknown) aggregate price
  pub valid_slot : u64,        // valid slot-time of agg. price
  pub twap       : Ema,        // time-weighted average price
  pub twac       : Ema,        // time-weighted average confidence interval
  pub drv1       : i64,        // space for future derived values
  pub drv2       : i64,        // space for future derived values
  pub prod       : AccKey,     // product account key
  pub next       : AccKey,     // next Price account in linked list
  pub prev_slot  : u64,        // valid slot of previous update
  pub prev_price : i64,        // aggregate price of previous update
  pub prev_conf  : u64,        // confidence interval of previous update
  pub drv3       : i64,        // space for future derived values
  pub agg        : PriceInfo,  // aggregate price info
  pub comp       : [PriceComp;32] // price components one per quoter
}

impl Price {
  pub fn get_current_price(&self) -> Option<(i64, i32)> {
    if !matches!(self.agg.status, PriceStatus::Trading) {
      None
    } else {
      Some((self.agg.price, self.expo))
    }
  }
}

pub fn load<T: Pod>(data: &[u8]) -> OtherResult<&T, PodCastError> {
    let size = size_of::<T>();
    Ok(from_bytes(cast_slice::<u8, u8>(try_cast_slice(
        &data[0..size],
    )?)))
}

#[cfg(target_endian = "little")]
unsafe impl Zeroable for Price {}

#[cfg(target_endian = "little")]
unsafe impl Pod for Price {}