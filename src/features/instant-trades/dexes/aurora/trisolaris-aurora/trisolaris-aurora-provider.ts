import { TrisolarisAuroraTrade } from 'src/features/instant-trades/dexes/aurora/trisolaris-aurora/trisolaris-aurora-trade';
import { UniswapV2AbstractProvider } from 'src/features/instant-trades/dexes/common/uniswap-v2-abstract/uniswap-v2-abstract-provider';
import { BLOCKCHAIN_NAME } from 'src/core/blockchain/models/blockchain-name';
import { TRISOLARIS_AURORA_PROVIDER_CONFIGURATION } from 'src/features/instant-trades/dexes/aurora/trisolaris-aurora/constants';

export class TrisolarisAuroraProvider extends UniswapV2AbstractProvider<TrisolarisAuroraTrade> {
    public readonly blockchain = BLOCKCHAIN_NAME.AURORA;

    public readonly InstantTradeClass = TrisolarisAuroraTrade;

    public readonly providerSettings = TRISOLARIS_AURORA_PROVIDER_CONFIGURATION;
}
