import type { Size } from '../src/types/common.d.ts';

export interface AppnexusVideoParams {
  id?: number | string;
  minduration?: number;
  maxduration?: number;
  skippable?: boolean;
  playback_method?: string;
  frameworks?: number[];
  context?: string;
  skipoffset?: number;
}

export interface AppnexusUserParams {
  age?: number;
  externalUid?: string;
  external_uid?: string;
  segments?: Array<number | Record<string, unknown>>;
  gender?: string;
  dnt?: boolean | number;
  language?: string;
}

/** Parameters accepted by the AppNexus bidder adapter. */
export interface AppnexusBidderParams {
  placementId?: number | string;
  /** @deprecated Use `placementId`. */
  placement_id?: number | string;
  member?: number | string;
  invCode?: string;
  /** @deprecated Use `invCode`. */
  inv_code?: string;
  allow_smaller_sizes?: boolean;
  use_payment_rule?: boolean;
  use_pmt_rule?: boolean;
  position?: 'above' | 'below' | string;
  traffic_source_code?: string;
  private_sizes?: Size[];
  supply_type?: string;
  pub_click?: string;
  ext_inv_code?: string;
  publisher_id?: number | string;
  external_imp_id?: string;
  reserve?: number;
  frameworks?: number[];
  video?: AppnexusVideoParams;
  user?: AppnexusUserParams;
  app?: Record<string, unknown> & { id?: string };
}

declare module '../src/adUnits' {
  interface BidderParams {
    appnexus: AppnexusBidderParams;
  }
}
