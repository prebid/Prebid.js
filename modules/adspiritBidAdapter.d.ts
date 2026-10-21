/** Parameters accepted by the AdSpirit bidder adapter. */
export interface AdspiritBidderParams {
    /** AdSpirit placement identifier. */
    placementId: string | number;
    /** AdSpirit ad server hostname, without scheme or path. */
    host: string;
    /** Optional minimum bid price in EUR CPM. */
    bidfloor?: string | number;
    siteId?: string;
    publisherId?: string;
    publisherName?: string;
    /**
     * Whether the AdSpirit renderer may target the surrounding document.
     * Defaults to true; false, 'false', 0 and '0' disable this behavior.
     * Browser iframe sandbox and cross-origin restrictions still apply.
     */
    allowIframeBreakout?: boolean | string | number;
}

/** Twiago uses a fixed host; all other parameters match AdSpirit. */
export type TwiagoBidderParams = Omit<AdspiritBidderParams, 'host'>;

declare module '../src/adUnits' {
    interface BidderParams {
        adspirit: AdspiritBidderParams;
        twiago: TwiagoBidderParams;
    }
}
