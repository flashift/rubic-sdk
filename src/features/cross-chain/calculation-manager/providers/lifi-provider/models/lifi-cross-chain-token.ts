export const сoinKey = {
    ETH: 'ETH',
    MATIC: 'MATIC',
    BNB: 'BNB',
    DAI: 'DAI',
    FTM: 'FTM',
    OKT: 'OKT',
    AVAX: 'AVAX',
    HT: 'HT',
    ONE: 'ONE',
    FSN: 'FSN',
    MOVR: 'MOVR',
    EXP: 'EXP',
    TCH: 'TCH',
    UBQ: 'UBQ',
    META: 'META',
    DIODE: 'DIODE',
    CELO: 'CELO',
    FUSE: 'FUSE',
    TLOS: 'TLOS',
    CRO: 'CRO',
    SHIB: 'SHIB',
    L1: 'L1',
    RBTC: 'RBTC',
    TBG: 'TBG',
    VLX: 'VLX',
    GLMR: 'GLMR',
    METIS: 'METIS',
    SOL: 'SOL',
    EVM: 'EVM',
    USDT: 'USDT',
    USDC: 'USDC',
    CBTUSDC: 'cbtUSDC',
    CBRUSDT: 'cbtUSDT',
    CBTWUSDT: 'cbtWUSDT',
    CBTWUSDC: 'cbtWUSDC',
    CBTCELR: 'cbtCELR',
    BUSD: 'BUSD',
    USDCE: 'USDCe',
    TEST: 'TEST',
    KAL: 'KAL',
    SDIODE: 'SDIODE',
    SPARK: 'SPARK',
    TRBTC: 'TRBTC',
    CXTT: 'CXTT',
    SGMETIS: 'sgMETIS',
    SGWOO: 'sgWOO',
    SGUSDT: 'sgUSDT',
    SGBUSD: 'sgBUSD',
    SGUSDC: 'sgUSDC',
    WBTC: 'WBTC',
    WETH: 'WETH',
    SUSHI: 'SUSHI',
    DODO: 'DODO',
    MCB: 'MCB',
    CELR: 'CELR',
    IF: 'IF'
} as const;

export type CoinKey = (typeof сoinKey)[keyof typeof сoinKey];

export const сhainId = {
    ETH: 1,
    POL: 137,
    BSC: 56,
    DAI: 100,
    OKT: 66,
    FTM: 250,
    AVA: 43114,
    ARB: 42161,
    HEC: 128,
    OPT: 10,
    ONE: 1666600000,
    FSN: 32659,
    MOR: 1285,
    EXP: 2,
    TCH: 7,
    UBQ: 8,
    MET: 11,
    DIO: 15,
    CEL: 42220,
    FUS: 122,
    TLO: 40,
    CRO: 25,
    BOB: 288,
    SHI: 27,
    GL1: 29,
    RSK: 30,
    TBW: 35,
    VEL: 106,
    MOO: 1284,
    MAM: 1088,
    AUR: 1313161554,
    SOL: 1151111081099710,
    TER: 1161011141099710,
    OAS: 111971151099710,
    EVM: 9001,
    ARN: 42170,
    ERA: 324,
    PZE: 1101,
    LNA: 59144,
    GOR: 5,
    METT: 12,
    DIOT: 13,
    MUM: 80001,
    ARBG: 421613,
    OPTG: 420,
    BSCT: 97,
    HECT: 256,
    ONET: 1666700000,
    FUST: 123,
    TLOT: 41,
    RSKT: 31,
    SOLT: 1151111081161011,
    TERT: 1161011141161011,
    OAST: 1119711511610111,
    AVAT: 43113,
    EVMT: 9000,
    MORT: 1287,
    FTMT: 4002,
    LNAT: 59140
} as const;

export type ChainId = (typeof сhainId)[keyof typeof сhainId];

export interface BaseToken {
    chainId: ChainId;
    address: string;
}
export interface StaticToken extends BaseToken {
    symbol: string;
    decimals: number;
    name: string;
    coinKey?: CoinKey;
    logoURI?: string;
}

export interface LifiToken extends StaticToken {
    priceUSD: string;
}
