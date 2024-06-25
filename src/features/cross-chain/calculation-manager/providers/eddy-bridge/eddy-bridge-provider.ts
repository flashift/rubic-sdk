import BigNumber from 'bignumber.js';
import { NotSupportedBlockchain, NotSupportedTokensError } from 'src/common/errors';
import { PriceToken, PriceTokenAmount } from 'src/common/tokens';
import { nativeTokensList } from 'src/common/tokens/constants/native-tokens';
import { BLOCKCHAIN_NAME, EvmBlockchainName } from 'src/core/blockchain/models/blockchain-name';
import { EvmWeb3Public } from 'src/core/blockchain/web3-public-service/web3-public/evm-web3-public/evm-web3-public';
import { FAKE_WALLET_ADDRESS } from 'src/features/common/constants/fake-wallet-address';
import { checkUnsupportedReceiverAddress } from 'src/features/common/utils/check-unsupported-receiver-address';
import { getFromWithoutFee } from 'src/features/common/utils/get-from-without-fee';
import { EddyFinanceProvider } from 'src/features/on-chain/calculation-manager/providers/dexes/zetachain/eddy-finance/eddy-finance-provider';

import { RequiredCrossChainOptions } from '../../models/cross-chain-options';
import { CROSS_CHAIN_TRADE_TYPE } from '../../models/cross-chain-trade-type';
import { CrossChainProvider } from '../common/cross-chain-provider';
import { CalculationResult } from '../common/models/calculation-result';
import { FeeInfo } from '../common/models/fee-info';
import { RubicStep } from '../common/models/rubicStep';
import { ProxyCrossChainEvmTrade } from '../common/proxy-cross-chain-evm-facade/proxy-cross-chain-evm-trade';
import {
    EDDY_CONTRACT_ADDRESS_IN_ZETACHAIN,
    TOKEN_SYMBOL_TO_ZETACHAIN_ADDRESS
} from './constants/eddy-bridge-contract-addresses';
import {
    EddyBridgeSupportedChain,
    eddyBridgeSupportedChains
} from './constants/eddy-bridge-supported-chains';
import { EDDY_BRIDGE_ABI } from './constants/edyy-bridge-abi';
import { EddyBridgeTrade } from './eddy-bridge-trade';

export class EddyBridgeProvider extends CrossChainProvider {
    public readonly type = CROSS_CHAIN_TRADE_TYPE.EDDY_BRIDGE;

    public isSupportedBlockchain(fromBlockchain: EvmBlockchainName): boolean {
        return eddyBridgeSupportedChains.some(chain => chain === fromBlockchain);
    }

    public async calculate(
        from: PriceTokenAmount<EvmBlockchainName>,
        toToken: PriceToken<EvmBlockchainName>,
        options: RequiredCrossChainOptions
    ): Promise<CalculationResult> {
        const fromBlockchain = from.blockchain as EddyBridgeSupportedChain;
        // const useProxy = options?.useProxy?.[this.type] ?? true;
        const useProxy = false;
        const walletAddress = this.getWalletAddress(fromBlockchain) || FAKE_WALLET_ADDRESS;
        try {
            checkUnsupportedReceiverAddress(
                options?.receiverAddress,
                options?.fromAddress || walletAddress
            );
            this.skipkNotSupportedRoutes(from, toToken);

            const [toAmount, feeInfo] = await Promise.all([
                this.getToTokenAmount(from, toToken, options),
                this.getFeeInfo(fromBlockchain, options.providerAddress, from, useProxy)
            ]);
            const fromWithoutFee = getFromWithoutFee(
                from,
                feeInfo.rubicProxy?.platformFee?.percent
            );

            const to = await PriceTokenAmount.createToken({
                ...toToken.asStruct,
                tokenAmount: toAmount
            });

            const gasData =
                options.gasCalculation === 'enabled'
                    ? await EddyBridgeTrade.getGasData({
                          feeInfo,
                          from: fromWithoutFee,
                          toToken: to,
                          providerAddress: options.providerAddress
                      })
                    : null;

            const trade = new EddyBridgeTrade({
                crossChainTrade: {
                    feeInfo,
                    from: fromWithoutFee,
                    gasData,
                    to,
                    priceImpact: from.calculatePriceImpactPercent(to)
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

    private async getToTokenAmount(
        from: PriceTokenAmount<EvmBlockchainName>,
        toToken: PriceToken<EvmBlockchainName>,
        options: RequiredCrossChainOptions
    ): Promise<BigNumber> {
        const zetaToken = nativeTokensList[BLOCKCHAIN_NAME.ZETACHAIN];
        const web3Public = this.getFromWeb3Public(BLOCKCHAIN_NAME.ZETACHAIN) as EvmWeb3Public;
        const platformFee = await web3Public.callContractMethod<number>(
            EDDY_CONTRACT_ADDRESS_IN_ZETACHAIN,
            EDDY_BRIDGE_ABI,
            'platformFee',
            []
        );
        // eddy currently takes 1% from bridged amount (platformFee = 10, ratioToAmount in than case = 0.99)
        const ratioToAmount = 1 - platformFee / 1_000;

        // Direct bridge ETH.ETH <-> ETH or BNB.BNB <-> BNB
        if (from.symbol.toLowerCase() === toToken.symbol.toLowerCase()) {
            return from.tokenAmount.multipliedBy(ratioToAmount);
            // ZETA -> Native in BNB or Ethereum
        } else if (from.blockchain === BLOCKCHAIN_NAME.ZETACHAIN && from.isNative) {
            const to = new PriceToken({
                address: TOKEN_SYMBOL_TO_ZETACHAIN_ADDRESS[toToken.symbol] as string,
                blockchain: BLOCKCHAIN_NAME.ZETACHAIN,
                decimals: 18,
                name: toToken.symbol,
                price: new BigNumber(0),
                symbol: toToken.symbol
            });
            const fromWithEddyBridgeFee = new PriceTokenAmount({
                ...from.asStruct,
                tokenAmount: from.tokenAmount.multipliedBy(ratioToAmount)
            });
            const calcData = await new EddyFinanceProvider().calculate(fromWithEddyBridgeFee, to, {
                ...options,
                gasCalculation: 'disabled',
                useProxy: false
            });

            return calcData.to.tokenAmount;
            // BNB or ETH -> ZETA
        } else {
            const toWithPrice = new PriceToken({
                ...zetaToken,
                price: new BigNumber(0)
            }) as PriceToken<EvmBlockchainName>;
            const calcData = await new EddyFinanceProvider().calculate(from, toWithPrice, {
                ...options,
                gasCalculation: 'disabled',
                useProxy: false
            });
            return calcData.to.tokenAmount.multipliedBy(ratioToAmount);
        }
    }

    private skipkNotSupportedRoutes(
        from: PriceTokenAmount<EvmBlockchainName>,
        toToken: PriceToken<EvmBlockchainName>
    ): void {
        const supportedTokens = ['eth', 'bnb', 'zeta'];

        // Prevents bridges BSC <-> Ethereum
        if (
            from.blockchain !== BLOCKCHAIN_NAME.ZETACHAIN &&
            toToken.blockchain !== BLOCKCHAIN_NAME.ZETACHAIN
        ) {
            throw new NotSupportedBlockchain();
        }
        // Only gas-token can be bridged from supported chains in ZetaChain
        if (from.blockchain !== BLOCKCHAIN_NAME.ZETACHAIN && !from.isNative) {
            throw new NotSupportedTokensError();
        }
        // Bridge from ZetaChain available only for ETH.ETH, BNB.BNB, ZETA
        if (
            from.blockchain === BLOCKCHAIN_NAME.ZETACHAIN &&
            !supportedTokens.includes(from.symbol.toLowerCase())
        ) {
            throw new NotSupportedTokensError();
        }
    }

    protected async getRoutePath(
        fromToken: PriceTokenAmount<EvmBlockchainName>,
        toToken: PriceTokenAmount<EvmBlockchainName>
    ): Promise<RubicStep[]> {
        return [{ type: 'cross-chain', provider: this.type, path: [fromToken, toToken] }];
    }

    protected async getFeeInfo(
        fromBlockchain: EddyBridgeSupportedChain,
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
