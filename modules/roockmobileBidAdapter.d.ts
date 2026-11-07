export interface RoockmobileBidderParams {
  /** Roockmobile channel identifier. */
  mid: string;
  /** Roockmobile authentication token. */
  token: string;
  /** Optional override for the placement identifier in OpenRTB `ortb2Imp.tagid`. */
  tagid?: string;
  /** Set to `1` to send the OpenRTB root field `test: 1`. */
  test?: 1;
  /** Overrides the HTTPS origin under a Roockmobile-controlled domain; request paths remain `/pbjs` and `/usersync`. */
  domain?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    roockmobile: RoockmobileBidderParams;
  }
}
