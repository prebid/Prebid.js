import type { AdapexBidParams, AdapexConfig } from '../../modules/adapexBidAdapter.js';
import type { FloxisBidParams } from '../../modules/floxisBidAdapter.js';
import type { AdUnitBidderBid, BidderParams } from '../../src/adUnits.js';
import type { Config } from '../../src/config.js';

type Assert<T extends true> = T;
export type AdapexIsTyped = Assert<'adapex' extends keyof BidderParams ? true : false>;
export type FloxisIsTyped = Assert<'floxis' extends keyof BidderParams ? true : false>;
export const adapex: AdUnitBidderBid<'adapex'> = { bidder: 'adapex', params: { seat: 'testSeat', bidFloor: 0.5, bidFloorCur: 'USD' } };
export const floxis: FloxisBidParams = { seat: 'testSeat', region: 'eu', partner: 'testPartner', bidFloor: 0.5 };
export const telemetry: Pick<Config, 'adapex'> = { adapex: { enableTelemetry: true } };
export const telemetryOptions: AdapexConfig = { enableTelemetry: false };
// @ts-expect-error - seat is required
export const missingSeat: AdapexBidParams = {};
// @ts-expect-error - seats are strings
export const numericSeat: AdapexBidParams = { seat: 42 };
// @ts-expect-error - Adapex uses a fixed host
export const invalidRoute: AdapexBidParams = { seat: 'testSeat', region: 'eu' };
// @ts-expect-error - telemetry requires a boolean
export const invalidTelemetry: AdapexConfig = { enableTelemetry: 'yes' };
