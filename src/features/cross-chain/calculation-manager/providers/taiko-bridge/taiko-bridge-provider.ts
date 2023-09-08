import { NotSupportedTokensError, RubicSdkError } from 'src/common/errors';
import { PriceToken, PriceTokenAmount } from 'src/common/tokens';
import { compareAddresses } from 'src/common/utils/blockchain';
import {
    BLOCKCHAIN_NAME,
    BlockchainName,
    EvmBlockchainName
} from 'src/core/blockchain/models/blockchain-name';
import { Injector } from 'src/core/injector/injector';
import { RequiredCrossChainOptions } from 'src/features/cross-chain/calculation-manager/models/cross-chain-options';
import { CROSS_CHAIN_TRADE_TYPE } from 'src/features/cross-chain/calculation-manager/models/cross-chain-trade-type';
import { CbridgeCrossChainSupportedBlockchain } from 'src/features/cross-chain/calculation-manager/providers/cbridge/constants/cbridge-supported-blockchains';
import { CrossChainProvider } from 'src/features/cross-chain/calculation-manager/providers/common/cross-chain-provider';
import { CalculationResult } from 'src/features/cross-chain/calculation-manager/providers/common/models/calculation-result';
import { FeeInfo } from 'src/features/cross-chain/calculation-manager/providers/common/models/fee-info';
import { l1Erc20ScrollGatewayAbi } from 'src/features/cross-chain/calculation-manager/providers/scroll-bridge/constants/l1-erc20-scroll-gateway-abi';
import { l2Erc20ScrollGatewayAbi } from 'src/features/cross-chain/calculation-manager/providers/scroll-bridge/constants/l2-erc20-scroll-gateway-abi';
import {
    scrollBridgeSupportedBlockchains
} from 'src/features/cross-chain/calculation-manager/providers/scroll-bridge/models/scroll-bridge-supported-blockchain';
import { TaikoBridgeSupportedBlockchain } from "./models/taiko-bridge-supported-blockchains";
import { taikoBridgeContractAddress } from "./constants/taiko-bridge-contract-address";
import { TaikoBridgeTrade } from "./taiko-bridge-trade";

export class TaikoBridgeProvider extends CrossChainProvider {
    public readonly type = CROSS_CHAIN_TRADE_TYPE.TAIKO_BRIDGE;

    public isSupportedBlockchain(
        blockchain: BlockchainName
    ): blockchain is TaikoBridgeSupportedBlockchain {
        return scrollBridgeSupportedBlockchains.some(
            supportedBlockchain => supportedBlockchain === blockchain
        );
    }

    public async calculate(
        fromToken: PriceTokenAmount<EvmBlockchainName>,
        toToken: PriceToken<EvmBlockchainName>,
        options: RequiredCrossChainOptions
    ): Promise<CalculationResult> {
        const fromBlockchain = fromToken.blockchain as TaikoBridgeSupportedBlockchain;
        const toBlockchain = toToken.blockchain as TaikoBridgeSupportedBlockchain;

        if (!this.areSupportedBlockchains(fromBlockchain, toBlockchain)) {
            return {
                trade: null,
                error: new NotSupportedTokensError(),
                tradeType: this.type
            };
        }

        try {
            const web3Public = Injector.web3PublicService.getWeb3Public(fromBlockchain);

            if (!fromToken.isNative) {
                if (fromBlockchain === BLOCKCHAIN_NAME.SEPOLIA) {
                    const l2Address = await web3Public.callContractMethod(
                        taikoBridgeContractAddress[fromBlockchain]!.providerGateway,
                        l1Erc20ScrollGatewayAbi,
                        'getL2ERC20Address',
                        [fromToken.address]
                    );
                    if (!compareAddresses(toToken.address, l2Address)) {
                        throw new RubicSdkError('Swap is not allowed.');
                    }
                } else {
                    const l1Address = await web3Public.callContractMethod(
                        taikoBridgeContractAddress[fromBlockchain]!.providerGateway,
                        l2Erc20ScrollGatewayAbi,
                        'getL1ERC20Address',
                        [fromToken.address]
                    );
                    if (!compareAddresses(toToken.address, l1Address)) {
                        throw new RubicSdkError('Swap is not allowed.');
                    }
                }
            } else {
                if (!toToken.isNative) {
                    throw new RubicSdkError('Swap is not allowed.');
                }
            }

            const to = new PriceTokenAmount({
                ...toToken.asStruct,
                tokenAmount: fromToken.tokenAmount
            });

            const gasData =
                options.gasCalculation === 'enabled'
                    ? await TaikoBridgeTrade.getGasData(fromToken, to)
                    : null;

            return {
                trade: new TaikoBridgeTrade(
                    {
                        from: fromToken,
                        to,
                        gasData
                    },
                    options.providerAddress
                ),
                tradeType: this.type
            };
        } catch (err) {
            const rubicSdkError = CrossChainProvider.parseError(err);

            return {
                trade: null,
                error: rubicSdkError,
                tradeType: this.type
            };
        }
    }

    protected async getFeeInfo(
        _fromBlockchain: CbridgeCrossChainSupportedBlockchain,
        _providerAddress: string,
        _percentFeeToken: PriceTokenAmount,
        _useProxy: boolean
    ): Promise<FeeInfo> {
        return {};
    }
}
