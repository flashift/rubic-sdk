import { CrossChainSupportedBlockchain } from '@features/cross-chain/constants/cross-chain-supported-blockchains';
import { CrossChainContractData } from '@features/cross-chain/contract-data/cross-chain-contract-data';
import BigNumber from 'bignumber.js';
import { PriceTokenAmount } from '@core/blockchain/tokens/price-token-amount';
import { AbiItem } from 'web3-utils';
import { crossChainContractAbiV2 } from '@features/cross-chain/contract-trade/constants/cross-chain-contract-abi-v2';
import { Web3Pure } from 'src/core';
import { Cache } from 'src/common';
import { ProviderData } from '@features/cross-chain/contract-data/models/provider-data';
import { CrossChainSupportedInstantTradeProvider } from '@features/cross-chain/models/cross-chain-supported-instant-trade';
import { crossChainContractAbiV3 } from '@features/cross-chain/contract-trade/constants/cross-chain-contract-abi-v3';
import { UniswapV3AlgebraAbstractProvider } from '@features/swap/dexes/common/uniswap-v3-algebra-abstract/uniswap-v3-algebra-abstract-provider';
import { OneinchAbstractProvider } from '@features/swap/dexes/common/oneinch-common/oneinch-abstract-provider';
import { crossChainContractAbiInch } from '@features/cross-chain/contract-trade/constants/cross-chain-contract-abi-inch';

enum TO_OTHER_BLOCKCHAIN_SWAP_METHOD {
    SWAP_TOKENS = 'swapTokensToOtherBlockchain',
    SWAP_CRYPTO = 'swapCryptoToOtherBlockchain'
}

enum TO_USER_SWAP_METHOD {
    SWAP_TOKENS = 'swapTokensToUserWithFee',
    SWAP_CRYPTO = 'swapCryptoToUserWithFee'
}

export abstract class ContractTrade {
    public abstract readonly fromToken: PriceTokenAmount;

    public abstract readonly toToken: PriceTokenAmount;

    public abstract readonly toTokenAmountMin: BigNumber;

    @Cache
    public get provider(): CrossChainSupportedInstantTradeProvider {
        return this.contract.providersData[this.providerIndex].provider;
    }

    @Cache
    private get providerData(): ProviderData {
        return this.contract.providersData[this.providerIndex];
    }

    protected constructor(
        public readonly blockchain: CrossChainSupportedBlockchain,
        public readonly contract: CrossChainContractData,
        private readonly providerIndex: number
    ) {}

    /**
     * Returns method's name and contract abi to call in source network.
     */
    public getMethodNameAndContractAbi(): {
        methodName: string;
        contractAbi: AbiItem[];
    } {
        let methodName: string = this.fromToken.isNative
            ? TO_OTHER_BLOCKCHAIN_SWAP_METHOD.SWAP_CRYPTO
            : TO_OTHER_BLOCKCHAIN_SWAP_METHOD.SWAP_TOKENS;
        let contractAbiMethod = {
            ...crossChainContractAbiV2.find(method => method.name === methodName)!
        };

        if (this.provider instanceof UniswapV3AlgebraAbstractProvider) {
            contractAbiMethod = {
                ...crossChainContractAbiV3.find(method => method.name!.startsWith(methodName))!
            };
        }

        if (this.provider instanceof OneinchAbstractProvider) {
            contractAbiMethod = {
                ...crossChainContractAbiInch.find(method => method.name!.startsWith(methodName))!
            };
        }

        methodName += this.providerData.methodSuffix;
        contractAbiMethod.name = methodName;

        return {
            methodName,
            contractAbi: [contractAbiMethod]
        };
    }

    /**
     * Returns method's arguments to use in source network.
     */
    public async getMethodArguments(
        toContractTrade: ContractTrade,
        walletAddress: string
    ): Promise<unknown[]> {
        const toNumOfBlockchain = await toContractTrade.contract.getNumOfBlockchain();

        const tokenInAmountAbsolute = this.fromToken.stringWeiAmount;

        const firstPath = this.getFirstPath();

        const secondPath = toContractTrade.getSecondPath();

        const fromTransitTokenAmountMinAbsolute = Web3Pure.toWei(
            this.toTokenAmountMin,
            this.toToken.decimals
        );

        const tokenOutAmountMinAbsolute = Web3Pure.toWei(
            toContractTrade.toTokenAmountMin,
            this.toToken.decimals
        );

        const walletAddressBytes32 = Web3Pure.addressToBytes32(walletAddress);

        const isToTokenNative = this.toToken.isNative;

        const swapToUserMethodSignature = toContractTrade.getSwapToUserMethodSignature();

        const methodArguments = [
            [
                toNumOfBlockchain,
                tokenInAmountAbsolute,
                firstPath,
                secondPath,
                fromTransitTokenAmountMinAbsolute,
                tokenOutAmountMinAbsolute,
                walletAddressBytes32,
                isToTokenNative
            ]
        ];

        await this.modifyArgumentsForProvider(methodArguments, walletAddress);

        methodArguments[0].push(swapToUserMethodSignature);

        return methodArguments;
    }

    protected abstract modifyArgumentsForProvider(
        methodArguments: unknown[][],
        walletAddress: string
    ): Promise<void>;

    /**
     * Returns `first path` method argument, converted from instant-trade data and chosen provider.
     * Must be called on source contract.
     */
    protected abstract getFirstPath(): string[] | string;

    /**
     * Returns `second path` method argument, converted from instant-trade data and chosen provider.
     * Must be called on target contract.
     */
    protected abstract getSecondPath(): string[];

    /**
     * Returns swap method name in target network.
     * Must be called on target contract.
     */
    public getSwapToUserMethodSignature(): string {
        let methodName: string = this.toToken.isNative
            ? TO_USER_SWAP_METHOD.SWAP_CRYPTO
            : TO_USER_SWAP_METHOD.SWAP_TOKENS;

        methodName += this.providerData.methodSuffix;

        return methodName;
    }
}
