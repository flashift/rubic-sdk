export const XY_ERROR_CODE = {
    10000: '10000',
    10001: '10001',
    20001: '20001',
    20003: '20003',
    20004: '20004',
    20005: '20005',
    20006: '20006',
    20007: '20007',
    20008: '20008',
    30001: '30001',
    30002: '30002',
    30003: '30003',
    30004: '30004',
    30005: '30005',
    30006: '30006'
} as const;

export type XyErrorCode = (typeof XY_ERROR_CODE)[keyof typeof XY_ERROR_CODE];
