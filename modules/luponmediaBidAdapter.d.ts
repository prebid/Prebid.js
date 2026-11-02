export interface LuponmediaBidderParams {
  /**
   * Integration key issued by LuponMedia: lowercase letters, digits, `-` and `_`, with parts
   * separated by dots (e.g. `'acme'` or `'acme.outstream'`).
   */
  key: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    luponmedia: LuponmediaBidderParams;
  }
}
