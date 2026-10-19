/** C-WIRE identifiers. Provide domainId or both pageId and placementId. */
export type CwireBidderParams = {
  /** C-WIRE domain identifier. */
  domainId: number;
  /** C-WIRE page identifier. */
  pageId?: number;
  /** C-WIRE placement identifier. */
  placementId?: number;
} | {
  domainId?: number;
  pageId: number;
  placementId: number;
};

declare module '../src/adUnits' {
  interface BidderParams {
    cwire: CwireBidderParams;
  }
}
