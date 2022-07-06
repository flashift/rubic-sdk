import { BLOCKCHAIN_NAME } from '@core/blockchain/models/blockchain-name';

export const lifiCrossChainSupportedBlockchains = [
    BLOCKCHAIN_NAME.ETHEREUM,
    BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
    BLOCKCHAIN_NAME.POLYGON,
    BLOCKCHAIN_NAME.AVALANCHE,
    BLOCKCHAIN_NAME.FANTOM,
    BLOCKCHAIN_NAME.ARBITRUM,
    BLOCKCHAIN_NAME.MOONRIVER,
    BLOCKCHAIN_NAME.HARMONY
] as const;

export type LifiCrossChainSupportedBlockchain = typeof lifiCrossChainSupportedBlockchains[number];
