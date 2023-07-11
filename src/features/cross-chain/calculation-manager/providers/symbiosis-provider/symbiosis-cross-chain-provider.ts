import BigNumber from 'bignumber.js';
import {
    MaxAmountError,
    MinAmountError,
    NotSupportedTokensError,
    RubicSdkError,
    TooLowAmountError
} from 'src/common/errors';
import { PriceToken, PriceTokenAmount } from 'src/common/tokens';
import { TokenStruct } from 'src/common/tokens/token';
import {
    BLOCKCHAIN_NAME,
    BlockchainName,
    EvmBlockchainName
} from 'src/core/blockchain/models/blockchain-name';
import { blockchainId } from 'src/core/blockchain/utils/blockchains-info/constants/blockchain-id';
import { Web3PrivateSupportedBlockchain } from 'src/core/blockchain/web3-private-service/models/web-private-supported-blockchain';
import { Web3Pure } from 'src/core/blockchain/web3-pure/web3-pure';
import { getFromWithoutFee } from 'src/features/common/utils/get-from-without-fee';
import { RequiredCrossChainOptions } from 'src/features/cross-chain/calculation-manager/models/cross-chain-options';
import { CROSS_CHAIN_TRADE_TYPE } from 'src/features/cross-chain/calculation-manager/models/cross-chain-trade-type';
import { CrossChainProvider } from 'src/features/cross-chain/calculation-manager/providers/common/cross-chain-provider';
import { CalculationResult } from 'src/features/cross-chain/calculation-manager/providers/common/models/calculation-result';
import { FeeInfo } from 'src/features/cross-chain/calculation-manager/providers/common/models/fee-info';
import { ProxyCrossChainEvmTrade } from 'src/features/cross-chain/calculation-manager/providers/common/proxy-cross-chain-evm-facade/proxy-cross-chain-evm-trade';
import {
    SymbiosisCrossChainSupportedBlockchain,
    symbiosisCrossChainSupportedBlockchains
} from 'src/features/cross-chain/calculation-manager/providers/symbiosis-provider/constants/symbiosis-cross-chain-supported-blockchain';
import { getSymbiosisV2Config } from 'src/features/cross-chain/calculation-manager/providers/symbiosis-provider/constants/symbiosis-v2-config';
import { SwappingParams } from 'src/features/cross-chain/calculation-manager/providers/symbiosis-provider/models/swapping-params';
import { SymbiosisTradeData } from 'src/features/cross-chain/calculation-manager/providers/symbiosis-provider/models/symbiosis-trade-data';
import { ZappingParams } from 'src/features/cross-chain/calculation-manager/providers/symbiosis-provider/models/zapping-params';
import { SymbiosisCrossChainTrade } from 'src/features/cross-chain/calculation-manager/providers/symbiosis-provider/symbiosis-cross-chain-trade';
import { oneinchApiParams } from 'src/features/on-chain/calculation-manager/providers/dexes/common/oneinch-abstract/constants';
import { Error, ErrorCode, Symbiosis, Token, TokenAmount } from 'symbiosis-js-sdk';

export class SymbiosisCrossChainProvider extends CrossChainProvider {
    public readonly type = CROSS_CHAIN_TRADE_TYPE.SYMBIOSIS;

    private readonly symbiosis = new Symbiosis(getSymbiosisV2Config(), 'rubic');

    public isSupportedBlockchain(
        blockchain: BlockchainName
    ): blockchain is SymbiosisCrossChainSupportedBlockchain {
        return symbiosisCrossChainSupportedBlockchains.some(
            supportedBlockchain => supportedBlockchain === blockchain
        );
    }

    public override areSupportedBlockchains(
        fromBlockchain: BlockchainName,
        toBlockchain: BlockchainName
    ): boolean {
        if (fromBlockchain === BLOCKCHAIN_NAME.BITCOIN) {
            return false;
        }

        return super.areSupportedBlockchains(fromBlockchain, toBlockchain);
    }

    public async calculate(
        from: PriceTokenAmount<EvmBlockchainName>,
        toToken: PriceToken,
        options: RequiredCrossChainOptions
    ): Promise<CalculationResult> {
        const fromBlockchain = from.blockchain as SymbiosisCrossChainSupportedBlockchain;
        const toBlockchain = toToken.blockchain as SymbiosisCrossChainSupportedBlockchain;
        const useProxy = options?.useProxy?.[this.type] ?? true;
        if (!this.areSupportedBlockchains(fromBlockchain, toBlockchain)) {
            return {
                trade: null,
                error: new NotSupportedTokensError(),
                tradeType: this.type
            };
        }

        try {
            const isBitcoinSwap = false;

            const fromAddress =
                options.fromAddress ||
                this.getWalletAddress(fromBlockchain as Web3PrivateSupportedBlockchain) ||
                oneinchApiParams.nativeAddress;

            const tokenIn = new Token({
                chainId: blockchainId[fromBlockchain],
                address: from.isNative ? '' : from.address,
                decimals: from.decimals,
                isNative: from.isNative
            });

            const feeInfo = await this.getFeeInfo(
                fromBlockchain,
                options.providerAddress,
                from,
                useProxy
            );
            const fromWithoutFee = getFromWithoutFee(
                from,
                feeInfo.rubicProxy?.platformFee?.percent
            );

            const receiverAddress = options.receiverAddress || fromAddress;

            const tokenAmountIn = new TokenAmount(tokenIn, fromWithoutFee.stringWeiAmount);

            const tokenOut = isBitcoinSwap
                ? null
                : new Token({
                      chainId: blockchainId[toBlockchain],
                      address: toToken.isNative ? '' : toToken.address,
                      decimals: toToken.decimals,
                      isNative: toToken.isNative
                  });

            const deadline = Math.floor(Date.now() / 1000) + 60 * options.deadline;
            const slippageTolerance = options.slippageTolerance * 10000;

            const trade = await this.getTrade(fromBlockchain, toBlockchain, {
                tokenAmountIn,
                tokenOut,
                fromAddress,
                receiverAddress,
                refundAddress: fromAddress,
                slippage: slippageTolerance,
                deadline
            });
            const { tokenAmountOut, fee: transitTokenFee, inTradeType, outTradeType } = trade;

            const swapFunction = (fromUserAddress: string, receiver?: string) => {
                if (isBitcoinSwap && !receiver) {
                    throw new RubicSdkError('No receiver address provider for bitcoin swap.');
                }
                const refundAddress = isBitcoinSwap ? fromUserAddress : receiver || fromAddress;
                const receiverAddress = isBitcoinSwap ? receiver! : receiver || fromUserAddress;

                const amountIn = fromWithoutFee.tokenAmount;
                const tokenAmountIn = new TokenAmount(
                    tokenIn,
                    Web3Pure.toWei(amountIn, from.decimals)
                );

                return this.getTrade(fromBlockchain, toBlockchain, {
                    tokenAmountIn,
                    tokenOut,
                    fromAddress: fromUserAddress,
                    receiverAddress,
                    refundAddress,
                    slippage: slippageTolerance,
                    deadline
                });
            };

            const to = new PriceTokenAmount({
                ...toToken.asStruct,
                tokenAmount: new BigNumber(tokenAmountOut.toFixed())
            });

            const gasData =
                options.gasCalculation === 'enabled'
                    ? await SymbiosisCrossChainTrade.getGasData(from, to)
                    : null;

            return {
                trade: new SymbiosisCrossChainTrade(
                    {
                        from,
                        to,
                        swapFunction,
                        gasData,
                        priceImpact: from.calculatePriceImpactPercent(to),
                        slippage: options.slippageTolerance,
                        feeInfo: {
                            ...feeInfo,
                            provider: {
                                cryptoFee: {
                                    amount: new BigNumber(transitTokenFee.toFixed()),
                                    tokenSymbol: transitTokenFee.token.symbol || ''
                                }
                            }
                        },
                        transitAmount: from.tokenAmount,
                        tradeType: { in: inTradeType, out: outTradeType }
                    },
                    options.providerAddress
                ),
                tradeType: this.type
            };
        } catch (err: unknown) {
            let rubicSdkError = CrossChainProvider.parseError(err);

            if ((err as { message: string })?.message?.includes('$')) {
                const symbiosisError = err as Error;
                rubicSdkError =
                    symbiosisError.code === ErrorCode.AMOUNT_LESS_THAN_FEE
                        ? new TooLowAmountError()
                        : await this.checkMinMaxErrors(symbiosisError);
            }

            return {
                trade: null,
                error: rubicSdkError,
                tradeType: this.type
            };
        }
    }

    private async checkMinMaxErrors(err: Error): Promise<RubicSdkError> {
        if (err.code === ErrorCode.AMOUNT_TOO_LOW) {
            const index = err.message!.lastIndexOf('$');
            const transitTokenAmount = new BigNumber(err.message!.substring(index + 1));
            return new MinAmountError(transitTokenAmount, 'USDC');
        }

        if (err?.code === ErrorCode.AMOUNT_TOO_HIGH) {
            const index = err.message!.lastIndexOf('$');
            const transitTokenAmount = new BigNumber(err.message!.substring(index + 1));
            return new MaxAmountError(transitTokenAmount, 'USDC');
        }

        return new RubicSdkError(err.message);
    }

    protected async getFeeInfo(
        fromBlockchain: SymbiosisCrossChainSupportedBlockchain,
        providerAddress: string,
        percentFeeToken: PriceTokenAmount,
        useProxy: boolean
    ): Promise<FeeInfo> {
        return ProxyCrossChainEvmTrade.getFeeInfo(
            fromBlockchain,
            providerAddress,
            percentFeeToken,
            useProxy
        );
    }

    private async getTrade(
        fromBlockchain: BlockchainName,
        toBlockchain: BlockchainName,
        swapParams: {
            tokenAmountIn: TokenAmount;
            tokenOut: Token | null;
            fromAddress: string;
            receiverAddress: string;
            refundAddress: string;
            slippage: number;
            deadline: number;
        }
    ): Promise<SymbiosisTradeData> {
        if (toBlockchain !== BLOCKCHAIN_NAME.BITCOIN && swapParams.tokenOut) {
            const swappingParams: SwappingParams = [
                swapParams.tokenAmountIn,
                swapParams.tokenOut,
                swapParams.fromAddress,
                swapParams.receiverAddress || swapParams.fromAddress,
                swapParams.fromAddress,
                swapParams.slippage,
                swapParams.deadline,
                true
            ];
            return this.getBestSwappingSwapResult(swappingParams);
        }

        const poolId =
            fromBlockchain === BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN
                ? blockchainId[BLOCKCHAIN_NAME.POLYGON]
                : blockchainId[BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN];
        const zappingParams: ZappingParams = [
            swapParams.tokenAmountIn,
            poolId,
            swapParams.fromAddress,
            swapParams.receiverAddress,
            swapParams.fromAddress,
            swapParams.slippage,
            swapParams.deadline,
            true
        ];

        try {
            return await this.getBestZappingSwapResult(zappingParams);
        } catch (err) {
            if (
                err.code === ErrorCode.AMOUNT_TOO_LOW ||
                err.code === ErrorCode.AMOUNT_LESS_THAN_FEE
            ) {
                throw err;
            }

            return this.getBestZappingSwapResult(zappingParams);
        }
    }

    private async getBestSwappingSwapResult(
        swappingParams: SwappingParams
    ): Promise<SymbiosisTradeData> {
        const swapping = this.symbiosis.newSwapping();
        return swapping.exactIn(...swappingParams);
    }

    private async getBestZappingSwapResult(
        zappingParams: ZappingParams
    ): Promise<SymbiosisTradeData> {
        const zapping = this.symbiosis.newZappingRenBTC();
        return zapping.exactIn(...zappingParams);
    }

    private getTransferToken(
        route: Token[],
        from: PriceTokenAmount<EvmBlockchainName>
    ): TokenStruct | undefined {
        const fromBlockchainId = blockchainId[from.blockchain];
        const fromRouting = route.filter(token => token.chainId === fromBlockchainId);

        const token = fromRouting.at(-1)!;
        return fromRouting.length !== 1
            ? {
                  address: token.address,
                  decimals: token.decimals,
                  name: token.name!,
                  blockchain: from.blockchain,
                  symbol: token.symbol!
              }
            : undefined;
    }
}
