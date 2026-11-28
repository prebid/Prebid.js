/** Parameters of the Railu bidder adapter. All are optional: with none, Railu bids on the page's own domain. */
export interface RailuBidParams {
  /** The seller's public Railu tag ID (console, Connect your supply); bids count as the seller's on its own verified domains. */
  tid?: string;
  /** The seller's registered Railu source key. */
  source?: string;
  /** Where the slot sits on the page; also read from `ortb2Imp.ext.data.placement`. */
  placement?: 'topscroll' | 'midscroll' | 'interscroller' | 'skin' | 'outstream' | 'instream' | 'infeed' | 'display';
  /** The format Railu answers in first when the ad unit declares several; by default the order the ad unit declares them in. */
  format?: 'banner' | 'video' | 'native';
  /** The property, only when `refererInfo` cannot see it. */
  domain?: string;
  /** The seller's declared first-party segments for this impression. */
  segments?: string[];
  /** The seller's declared signal ids. */
  signals?: string[];
  /** `true`: Railu answers a fixed sample bid ($0.50) that is never billed, for integration testing. */
  test?: boolean;
  /** Override the bid endpoint. */
  endpoint?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    railu: RailuBidParams;
  }
}
