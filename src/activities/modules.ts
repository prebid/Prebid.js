export const MODULE_TYPE_PREBID = 'prebid';
export const MODULE_TYPE_BIDDER = 'bidder';
export const MODULE_TYPE_UID = 'userId';
export const MODULE_TYPE_RTD = 'rtd';
export const MODULE_TYPE_ANALYTICS = 'analytics';
export type ModuleType = typeof MODULE_TYPE_PREBID
    | typeof MODULE_TYPE_BIDDER
    | typeof MODULE_TYPE_UID
    | typeof MODULE_TYPE_RTD
    | typeof MODULE_TYPE_ANALYTICS;
