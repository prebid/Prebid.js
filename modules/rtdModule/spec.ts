import type {AllConsentData} from "../../src/consentHandler.ts";
import type {AdUnitCode, ByAdUnit, StorageDisclosure} from "../../src/types/common";
import {EVENTS} from '../../src/constants.ts';
import type {EventPayload} from "../../src/events.ts";
import type {TargetingMap} from "../../src/targeting.ts";
import type {StartAuctionOptions} from "../../src/prebid.ts";

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
}

export type RTDProviderConfig<P extends RTDProvider> = BaseConfig<P> & (
    P extends keyof ProviderConfig ? ProviderConfig[P] : Record<string, unknown>
);

type RTDEvent = typeof EVENTS.AUCTION_INIT |
    typeof EVENTS.AUCTION_END |
    typeof EVENTS.BID_RESPONSE |
    typeof EVENTS.BID_REQUESTED |
    typeof EVENTS.BID_ACCEPTED;

type EventHandlers<P extends RTDProvider> = {
    [EV in RTDEvent]: (payload: EventPayload<EV>, config: RTDProviderConfig<P>, consent: AllConsentData) => void;
};

export type RtdProviderSpec<P extends RTDProvider> = Partial<EventHandlers<P>> & StorageDisclosure & {
    /**
     * must match the name provided by the publisher in the on-page config
     */
    name: P;
    /**
     * global vendor list ID for your submodule
     */
    gvlid?: number;
    /**
     * Invoked once on initialization.
     */
    init: (config: RTDProviderConfig<P>, consent: AllConsentData) => boolean;
    getTargetingData?: (adUnitCodes: AdUnitCode[], config: RTDProviderConfig<P>, consent: AllConsentData, auction: EventPayload<typeof EVENTS.AUCTION_END>) => ByAdUnit<TargetingMap<any>>;
    getBidRequestData?: (request: StartAuctionOptions, callback: () => void, config: RTDProviderConfig<P>, consent: AllConsentData, timeout: number) => void;
    onDataDeletionRequest?: (config: RTDProviderConfig<P>) => void;
}

declare module '../../src/hook' {
    interface Submodules {
        realTimeData: [RtdProviderSpec<RTDProvider>];
    }
}
