/** Type declarations added by the Codex bot for PubMatic's public adapter interface. */
export interface PubmaticVideoParams {
  mimes?: string[];
  skippable?: boolean;
  minduration?: number;
  maxduration?: number;
  startdelay?: number;
  playbackmethod?: number[];
  api?: number[];
  protocols?: number[];
  battr?: number[];
  linearity?: number;
  plcmt?: number;
  /** @deprecated Use `plcmt`. */
  placement?: number;
  minbitrate?: number;
  maxbitrate?: number;
}

/** Parameters accepted by the PubMatic bidder adapter. */
export interface PubmaticBidderParams {
  /** PubMatic publisher ID. This value must be supplied as a string. */
  publisherId: string;
  adSlot?: string;
  pmzoneid?: string;
  lat?: string;
  lon?: string;
  yob?: string;
  kadpageurl?: string;
  gender?: string;
  kadfloor?: string;
  currency?: string;
  dctr?: string;
  deals?: string[];
  /** @deprecated Use `ortb2.bcat` instead. */
  bcat?: string[];
  /** @deprecated Use `ortb2.acat` instead. */
  acat?: string[];
  wiid?: string;
  profId?: string;
  verId?: string;
  hashedKey?: string;
  /** Blue Billywig renderer application unit, used for outstream video. */
  outstreamAU?: string;
  video?: PubmaticVideoParams;
}

declare module '../src/adUnits' {
  interface BidderParams {
    pubmatic: PubmaticBidderParams;
  }
}
