import type { AllConsentData, GVLIDs } from "../../src/consentHandler.ts";
import type { AdUnitCode, ByAdUnit, StorageDisclosure } from "../../src/types/common";
import { EVENTS } from '../../src/constants.ts';
import type { EventPayload } from "../../src/events.ts";
import type { TargetingMap } from "../../src/targeting.ts";
import type { StartAuctionOptions } from "../../src/prebid.ts";

export type RTDProvider = string;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProviderConfig {
  /**
   * Map from ID provider name to the type of their configuration params.
   */
}

type BaseConfig<P extends RTDProvider> = {
  /**
   * RTD provider name.
   */
  name: P;
  /**
   * If true, delay the auction up to `auctionDelay` milliseconds to wait for this module.
   */
  waitForIt?: boolean;
};

export type RTDProviderConfig<P extends RTDProvider> = BaseConfig<P> & (
    P extends keyof ProviderConfig ? ProviderConfig[P] : Record<string, unknown>
);

/**
 * Map from the name of each event handler a submodule may define to the event it is called for.
 */
type RTDEventHandlerNames = {
  onAuctionInitEvent: typeof EVENTS.AUCTION_INIT;
  onAuctionEndEvent: typeof EVENTS.AUCTION_END;
  onBidResponseEvent: typeof EVENTS.BID_RESPONSE;
  onBidRequestEvent: typeof EVENTS.BID_REQUESTED;
  onBidAcceptedEvent: typeof EVENTS.BID_ACCEPTED;
};

type EventHandlers<P extends RTDProvider> = {
  [H in keyof RTDEventHandlerNames]: (payload: EventPayload<RTDEventHandlerNames[H]>, config: RTDProviderConfig<P>, consent: AllConsentData) => void;
};

export type RtdProviderSpec<P extends RTDProvider> = Partial<EventHandlers<P>> & StorageDisclosure & {
  /**
   * must match the name provided by the publisher in the on-page config
   */
  name: P;
  /**
   * global vendor list ID for your submodule.
   * May be a list, for submodules that act on behalf of several vendors; all of them then need a legal basis.
   */
  gvlid?: GVLIDs;
  /**
   * Google Additional Consent provider ID, for vendors that are not on the GVL.
   * Used by the TCF control module to check vendor consent against the CMP's Additional Consent string
   * when the module has no GVL ID. This is a different ID space from GVL IDs.
   * @see https://support.google.com/admanager/answer/9681920
   */
  acpId?: number;
  /**
   * Invoked once on initialization.
   */
  init: (config: RTDProviderConfig<P>, consent: AllConsentData) => boolean;
  getTargetingData?: (adUnitCodes: AdUnitCode[], config: RTDProviderConfig<P>, consent: AllConsentData, auction: EventPayload<typeof EVENTS.AUCTION_END>) => ByAdUnit<TargetingMap<any>>;
  getBidRequestData?: (request: StartAuctionOptions, callback: () => void, config: RTDProviderConfig<P>, consent: AllConsentData, timeout: number,
    /** False once RTD releases this request, including an early release. */
    isAuctionActive?: () => boolean) => void;
  onDataDeletionRequest?: (config: RTDProviderConfig<P>) => void;
};

declare module '../../src/hook' {
  interface Submodules {
    realTimeData: [RtdProviderSpec<RTDProvider>];
  }
}
