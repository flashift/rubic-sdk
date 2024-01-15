import { BLOCKCHAIN_NAME } from 'src/core/blockchain/models/blockchain-name';
import {
    Web3PublicSupportedBlockchain,
    web3PublicSupportedBlockchains
} from 'src/core/blockchain/web3-public-service/models/web3-public-storage';

const otherWeb3PublicSupportedBlockchains = Object.values(web3PublicSupportedBlockchains).reduce(
    (acc, blockchain) => ({ ...acc, [blockchain]: '' }),
    {} as Record<Web3PublicSupportedBlockchain, string>
);

export const MULTICALL_ADDRESSES: Record<Web3PublicSupportedBlockchain, string> = {
    ...otherWeb3PublicSupportedBlockchains,
    [BLOCKCHAIN_NAME.ETHEREUM]: '0x5ba1e12693dc8f9c48aad8770482f4739beed696',
    [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: '0x15dc8b5ed578AA7a019dd0139B330cfD625cA795',
    [BLOCKCHAIN_NAME.POLYGON]: '0x176730799C812d70C6608F51aEa6C7e5cdA7eA50',
    [BLOCKCHAIN_NAME.AVALANCHE]: '0xdDCbf776dF3dE60163066A5ddDF2277cB445E0F3',
    [BLOCKCHAIN_NAME.MOONRIVER]: '0x270f2F35bED92B7A59eA5F08F6B3fd34c8D9D9b5',
    [BLOCKCHAIN_NAME.FANTOM]: '0x22D4cF72C45F8198CfbF4B568dBdB5A85e8DC0B5',
    [BLOCKCHAIN_NAME.HARMONY]: '0xdDCbf776dF3dE60163066A5ddDF2277cB445E0F3',
    [BLOCKCHAIN_NAME.ARBITRUM]: '0x80C7DD17B01855a6D2347444a0FCC36136a314de',
    [BLOCKCHAIN_NAME.AURORA]: '0xe0e3887b158F7F9c80c835a61ED809389BC08d1b',
    [BLOCKCHAIN_NAME.TELOS]: '0x53dC7535028e2fcaCa0d847AD108b9240C0801b1',
    [BLOCKCHAIN_NAME.OPTIMISM]: '0xeAa6877139d436Dc6d1f75F3aF15B74662617B2C',
    [BLOCKCHAIN_NAME.CRONOS]: '0x5e954f5972EC6BFc7dECd75779F10d848230345F',
    [BLOCKCHAIN_NAME.OKE_X_CHAIN]: '0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3',
    [BLOCKCHAIN_NAME.GNOSIS]: '0x67dA5f2FfaDDfF067AB9d5F025F8810634d84287',
    [BLOCKCHAIN_NAME.FUSE]: '0x0769fd68dFb93167989C6f7254cd0D766Fb2841F',
    [BLOCKCHAIN_NAME.MOONBEAM]: '0x6477204E12A7236b9619385ea453F370aD897bb2',
    [BLOCKCHAIN_NAME.CELO]: '0x9aac9048fC8139667D6a2597B902865bfdc225d3',
    [BLOCKCHAIN_NAME.BOBA]: '0x96a5Eac3fa7BB87c61881Dc093884C06719Bcd1E',
    [BLOCKCHAIN_NAME.ASTAR_EVM]: '0xcA11bde05977b3631167028862bE2a173976CA11',
    [BLOCKCHAIN_NAME.ETHEREUM_POW]: '0x5ba1e12693dc8f9c48aad8770482f4739beed696',
    [BLOCKCHAIN_NAME.KAVA]: '0x45be772faE4a9F31401dfF4738E5DC7DD439aC0b',
    [BLOCKCHAIN_NAME.TRON]: 'T9ziQU4EBteJzjzMzhHELdhgWFqwzS5Vki',
    [BLOCKCHAIN_NAME.BITGERT]: '0x6BB10762aE02d0544a0E948B62EaeBD991100622',
    [BLOCKCHAIN_NAME.OASIS]: '0xDA294FDE76F7369ed93D7C7A3FD2d5277C2003B5',
    [BLOCKCHAIN_NAME.METIS]: '0xc39aBB6c4451089dE48Cffb013c39d3110530e5C',
    [BLOCKCHAIN_NAME.DFK]: '0x5b24224dC16508DAD755756639E420817DD4c99E',
    [BLOCKCHAIN_NAME.KLAYTN]: '0xd11dfc2ab34abd3e1abfba80b99aefbd6255c4b8',
    [BLOCKCHAIN_NAME.VELAS]: '0x0747CFe82D3Bee998f634569FE2B0005dF9d8EDE',
    [BLOCKCHAIN_NAME.SYSCOIN]: '0x0c50a45401fA051F5F38e98d0E323f08eFa3bb0b',
    [BLOCKCHAIN_NAME.ZK_SYNC]: '0xDBA7ab3Ed22044417380E9358aAabCF85683f3c8',
    [BLOCKCHAIN_NAME.PULSECHAIN]: '0x5ba1e12693dc8f9c48aad8770482f4739beed696',
    // [BLOCKCHAIN_NAME.POLYGON_ZKEVM]: '0xca11bde05977b3631167028862be2a173976ca11',
    [BLOCKCHAIN_NAME.LINEA]: '0xcA11bde05977b3631167028862bE2a173976CA11',
    [BLOCKCHAIN_NAME.BASE]: '0xcA11bde05977b3631167028862bE2a173976CA11',
    [BLOCKCHAIN_NAME.MANTLE]: '0xcA11bde05977b3631167028862bE2a173976CA11',
    [BLOCKCHAIN_NAME.SCROLL_SEPOLIA]: '0xcA11bde05977b3631167028862bE2a173976CA11',
    [BLOCKCHAIN_NAME.ARTHERA]: '0x49a390a3dFd2d01389f799965F3af5961f87d228',
    [BLOCKCHAIN_NAME.ZETACHAIN]: '0x10253594A832f967994b44f33411940533302ACb',
    [BLOCKCHAIN_NAME.TAIKO]: '0x83D4a9Ea77a4dbA073cD90b30410Ac9F95F93E7C',
    [BLOCKCHAIN_NAME.SEPOLIA]: '0x805488daa81c1b9e7c5ce3f1dcea28f21448ec6a',
    [BLOCKCHAIN_NAME.GOERLI]: '0x5ba1e12693dc8f9c48aad8770482f4739beed696',
    [BLOCKCHAIN_NAME.MANTA_PACIFIC]: '0xf43727c9BEb4C0aA3fEE1281A902e518f8586E54',
    [BLOCKCHAIN_NAME.SCROLL]: '0xcA11bde05977b3631167028862bE2a173976CA11',
    [BLOCKCHAIN_NAME.HORIZEN_EON]: '0x4ea6779581bDAcd376724A52070bE89FfB74eC39'
};
