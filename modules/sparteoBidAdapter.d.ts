import type { RequireAtLeastOne } from '../src/types/objects.d.ts';

interface SparteoBidParamsBase {
  /** Reporting value sent with the impression; alphanumeric, `-` or `_`, at most 40 characters. */
  custom1?: string;
  /** Reporting value sent with the impression; alphanumeric, `-` or `_`, at most 40 characters. */
  custom2?: string;
  /** Reporting value sent with the impression; alphanumeric, `-` or `_`, at most 40 characters. */
  custom3?: string;
  /** Reporting value sent with the impression; alphanumeric, `-` or `_`, at most 40 characters. */
  custom4?: string;
  /** Reporting value sent with the impression; alphanumeric, `-` or `_`, at most 40 characters. */
  custom5?: string;
  /** Overrides the bid request URL (read from the first bid of the request); may contain the endpoint's macros. */
  endpoint?: string;
}

/** Parameters accepted by the Sparteo bidder adapter: `networkId` (or the legacy `publisherId`) is required. */
export type SparteoBidParams = RequireAtLeastOne<SparteoBidParamsBase & {
  /** Network ID, given by Sparteo. */
  networkId?: string;
  /** @deprecated Use `networkId`. */
  publisherId?: string;
}, 'networkId' | 'publisherId'>;

declare module '../src/adUnits' {
  interface BidderParams {
    sparteo: SparteoBidParams;
  }
}
