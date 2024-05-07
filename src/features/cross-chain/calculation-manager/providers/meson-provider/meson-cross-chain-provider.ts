import BigNumber from 'bignumber.js';
import {
    MaxAmountError,
    MinAmountError,
    NotSupportedBlockchain,
    NotSupportedTokensError
} from 'src/common/errors';
import { PriceToken, PriceTokenAmount } from 'src/common/tokens';
import { compareAddresses } from 'src/common/utils/blockchain';
import { EvmBlockchainName } from 'src/core/blockchain/models/blockchain-name';
import { blockchainId } from 'src/core/blockchain/utils/blockchains-info/constants/blockchain-id';
import { getFromWithoutFee } from 'src/features/common/utils/get-from-without-fee';
import Web3 from 'web3';

import { RequiredCrossChainOptions } from '../../models/cross-chain-options';
import { CrossChainProvider } from '../common/cross-chain-provider';
import { BRIDGE_TYPE } from '../common/models/bridge-type';
import { CalculationResult } from '../common/models/calculation-result';
import { FeeInfo } from '../common/models/fee-info';
import { RubicStep } from '../common/models/rubicStep';
import { ProxyCrossChainEvmTrade } from '../common/proxy-cross-chain-evm-facade/proxy-cross-chain-evm-trade';
import {
    mesonCrossChainSupportedChains,
    MesonSupportedBlockchain
} from './constants/meson-cross-chain-supported-chains';
import { MesonCrossChainTrade } from './meson-cross-chain-trade';
import { MesonLimitsChain, MesonLimitsToken, SrcDstChainsIds } from './models/meson-api-types';
import { FetchedMesonTradeInfo } from './models/meson-provider-types';
import { MesonCcrApiService } from './services/meson-cross-chain-api-service';

export class MesonCrossChainProvider extends CrossChainProvider {
    public readonly type = BRIDGE_TYPE.MESON;

    public isSupportedBlockchain(blockchain: EvmBlockchainName): boolean {
        return mesonCrossChainSupportedChains.some(
            supportedBlockchain => supportedBlockchain === blockchain
        );
    }

    public async calculate(
        from: PriceTokenAmount<EvmBlockchainName>,
        toToken: PriceToken<EvmBlockchainName>,
        options: RequiredCrossChainOptions
    ): Promise<CalculationResult> {
        const fromBlockchain = from.blockchain as MesonSupportedBlockchain;
        const useProxy = options?.useProxy?.[this.type] ?? true;

        try {
            const { max, min, mesonFee, sourceAssetString, targetAssetString } =
                await this.fetchTradeInfo(from, toToken);

            if (from.tokenAmount.lt(min)) {
                throw new MinAmountError(min, from.symbol);
            }
            if (from.tokenAmount.gt(max)) {
                throw new MaxAmountError(max, from.symbol);
            }

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

            const toAmount = from.tokenAmount.minus(mesonFee);

            const to = new PriceTokenAmount({
                ...toToken.asStruct,
                tokenAmount: toAmount
            });

            const gasData =
                options.gasCalculation === 'enabled'
                    ? await MesonCrossChainTrade.getGasData({
                          from: fromWithoutFee,
                          feeInfo,
                          toToken: to,
                          providerAddress: options.providerAddress,
                          sourceAssetString,
                          targetAssetString
                      })
                    : null;

            const trade = new MesonCrossChainTrade({
                crossChainTrade: {
                    feeInfo,
                    from: fromWithoutFee,
                    gasData,
                    to,
                    priceImpact: from.calculatePriceImpactPercent(to),
                    sourceAssetString,
                    targetAssetString
                },
                providerAddress: options.providerAddress,
                routePath: await this.getRoutePath(from, to)
            });

            return { trade, tradeType: this.type };
        } catch (err) {
            const rubicSdkError = CrossChainProvider.parseError(err);

            return {
                trade: null,
                error: rubicSdkError,
                tradeType: this.type
            };
        }
    }

    private async fetchTradeInfo(
        sourceToken: PriceTokenAmount<EvmBlockchainName>,
        targetToken: PriceToken<EvmBlockchainName>
    ): Promise<FetchedMesonTradeInfo> {
        const mesonChains = await MesonCcrApiService.fetchChainsLimits();

        const sourceTokenInfo = this.getApiTokenInfo(sourceToken, mesonChains);
        const targetTokenInfo = this.getApiTokenInfo(targetToken, mesonChains);
        const mesonChainsSymbols = this.getTxChainsSymbols(sourceToken, targetToken, mesonChains);

        const sourceAssetString = `${mesonChainsSymbols[0]}:${sourceTokenInfo.id}`;
        const targetAssetString = `${mesonChainsSymbols[1]}:${targetTokenInfo.id}`;

        const mesonFee = await MesonCcrApiService.fetchMesonFee(
            sourceAssetString,
            targetAssetString,
            sourceToken.tokenAmount.toFixed()
        );

        return {
            mesonFee,
            sourceAssetString,
            targetAssetString,
            min: new BigNumber(sourceTokenInfo.min),
            max: new BigNumber(sourceTokenInfo.max)
        };
    }

    private getApiTokenInfo(
        token: PriceToken<EvmBlockchainName>,
        apiChains: MesonLimitsChain[]
    ): MesonLimitsToken {
        const chainId = blockchainId[token.blockchain];
        const hexChainId = Web3.utils.toHex(chainId);
        const foundChain = apiChains.find(chain => compareAddresses(chain.chainId, hexChainId));

        if (!foundChain) {
            throw new NotSupportedBlockchain();
        }

        const foundToken = token.isNative
            ? foundChain.tokens.find(apiToken => !Object.hasOwn(apiToken, 'addr'))
            : foundChain.tokens.find(apiToken => compareAddresses(apiToken.addr, token.address));

        if (!foundToken) {
            throw new NotSupportedTokensError();
        }

        return foundToken;
    }

    private getTxChainsSymbols(
        sourceToken: PriceToken<EvmBlockchainName>,
        targetToken: PriceToken<EvmBlockchainName>,
        apiChains: MesonLimitsChain[]
    ): SrcDstChainsIds {
        const sourceChainIdHex = Web3.utils.toHex(blockchainId[sourceToken.blockchain]);
        const targetChainIdHex = Web3.utils.toHex(blockchainId[targetToken.blockchain]);

        const ids = apiChains.reduce(
            (acc, chain) => {
                if (compareAddresses(chain.chainId, sourceChainIdHex)) acc[0] = chain.id;
                if (compareAddresses(chain.chainId, targetChainIdHex)) acc[1] = chain.id;

                return acc;
            },
            ['', ''] satisfies SrcDstChainsIds
        );

        return ids;
    }

    protected async getRoutePath(
        fromToken: PriceTokenAmount<EvmBlockchainName>,
        toToken: PriceTokenAmount<EvmBlockchainName>
    ): Promise<RubicStep[]> {
        return [{ type: 'cross-chain', provider: this.type, path: [fromToken, toToken] }];
    }

    protected async getFeeInfo(
        fromBlockchain: MesonSupportedBlockchain,
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
}
