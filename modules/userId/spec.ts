import type {BidderCode, StorageDisclosure} from "../../src/types/common";
import {STORAGE_TYPE_COOKIES, STORAGE_TYPE_LOCALSTORAGE, type StorageType} from "../../src/storageManager.ts";
import type {AllConsentData} from "../../src/consentHandler.ts";
import type {Ext} from '../../src/types/ortb/common';
import type {ORTBRequest} from "../../src/types/ortb/request";

export type UserIdProvider = string;

export interface UserId {
    [idName: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProvidersToId {
    /**
     * Map from ID provider name to the key they provide in .userId.
     */
}

export type UserIdKeyFor<P extends UserIdProvider> = P extends keyof ProvidersToId ? ProvidersToId[P] : unknown;
export type UserIdFor<P extends UserIdProvider> = P extends keyof ProvidersToId ? UserId[UserIdKeyFor<P>] : unknown;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProviderParams {
    /**
     * Map from ID provider name to the type of their configuration params.
     */
}

export interface UserIdConfig<P extends UserIdProvider> {
    /**
     * User ID provider name.
     */
    name: P;
    /**
     * Module specific configuration parameters.
     */
    params?: P extends keyof ProviderParams ? ProviderParams[P] : Record<string, unknown>;
    /**
     * An array of bidder codes to which this user ID may be sent.
     */
    bidders?: BidderCode[];
    /**
     * Where the user ID will be stored.
     */
    storage?: {
        /**
         * Storage method.
         */
        type: StorageType | `${typeof STORAGE_TYPE_COOKIES}&${typeof STORAGE_TYPE_LOCALSTORAGE}` | `${typeof STORAGE_TYPE_LOCALSTORAGE}&${typeof STORAGE_TYPE_COOKIES}`;
        /**
         * The name of the cookie or html5 local storage where the user ID will be stored.
         */
        name: string;
        /**
         * How long (in days) the user ID information will be stored. If this parameter isn’t specified,
         * session cookies are used in cookie-mode, and local storage mode will create new IDs on every page.
         */
        expires?: number;
        /**
         * The amount of time (in seconds) the user ID should be cached in storage before calling the provider again
         * to retrieve a potentially updated value for their user ID.
         * If set, this value should equate to a time period less than the number of days defined in storage.expires.
         * By default the ID will not be refreshed until it expires.
         */
        refreshInSeconds?: number;
    }
    /**
     * Used only if the page has a separate mechanism for storing a User ID.
     * The value is an object containing the values to be sent to the adapters.
     */
    value?: UserIdFor<P>;
}

type SerializableId = string | Record<string, unknown>;

/**
 * If your module can provide ID data synchronously it should set id directly; otherwise it should provide a callback that calls its first argument setId passing it ID data.
 *
 * In both cases ID data should be a string or a plain, serializable JS object;
 * this data is what may then get stored, passed to decode and, on later sessions, to getId or extendId as the storedId argument.
 */
export type ProviderResponse = {
    /**
     * Serializable ID data. Objects will be passed through JSON.stringify
     */
    id?: SerializableId;
    /**
     * If provided, will be invoked at a later point.
     */
    callback?: (setId: (id: SerializableId) => void, getStoredValue: () => SerializableId) => void;
}

type DecodedId<P extends UserIdProvider> = P extends keyof ProvidersToId ? { [K in UserIdKeyFor<P>]: UserIdFor<P> } & Partial<UserId> : Partial<UserId>;

type IdValue<K extends keyof UserId> = UserId[K] extends any[] ? UserId[K][number] : UserId[K];

type EIDConfig<K extends keyof UserId> = {
    /**
     * Value for eid.source.
     * Required if getSource is not provided.
     */
    source?: string;
    /**
     * Returns a string to use for eid.source.
     * Required if source is not provided.
     */
    getSource?: (id: IdValue<K>) => string;
    /**
     * Returns an object to use for eid.ext
     */
    getEidExt?: (id: IdValue<K>) => Ext;
    /**
     * Returns a string to use for eid.uid.id.
     * If not provided, IDs returned by decode must be strings, and will be used as-is
     */
    getValue?: (id: IdValue<K>) => string;
    /**
     * Value for eid.uid.atype
     */
    atype?: string;
    /**
     * Returns an object to use for eids.uid.ext
     */
    getUidExt?: (id: IdValue<K>) => Ext;
}

type EIDFn<K extends keyof UserId, P extends UserIdProvider> = (ids: IdValue<K>[], config: UserIdConfig<P>) => ORTBRequest['user']['eids'] | ORTBRequest['user']['eids'][number];

export type IdProviderSpec<P extends UserIdProvider> = StorageDisclosure & {
    /**
     * Name of your ID provider, used to match your module with the publisher’s userIds configuration
     */
    name: P;
    aliasName?: UserIdProvider;
    /**
     * GVL ID to use for TCF. If omitted your module may be excluded when TCF is in scope.
     */
    gvlid?: number;
    disclosureURL?: string;
    /**
     * Invoked when:
     *  - Prebid.js did not previously store your ID, or
     *  - your previously stored ID has expired (depending on the publisher’s expires and/or refreshInSecondsstorage configuration), or
     *  - consent data has changed since the last time it was stored, or
     *  - the publisher explicitly asked for a refresh using refreshUserIds.
     * @param config Configuration for your module as provided by the publisher
     * @param consentData available consent data (when the relevant modules are present)
     * @param storedId Your previously stored ID data, if any, as was returned by getId or extendId
     */
    getId: (config: UserIdConfig<P>, consentData: AllConsentData, storedId?: SerializableId) => ProviderResponse;
    /**
     * If provided, it’s invoked when getId is not; namely:
     *
     *   - Prebid.js previously stored your ID, and
     *   - the stored ID has not expired, and
     *   - consent data has not changed since it was stored, and
     *   - the publisher is not asking for a refresh.
     *
     * Takes the same arguments and should return an object in the same format as getId.
     */
    extendId?: IdProviderSpec<P>['getId'];
    /**
     * Decode ID data. Invoked every time data from your module is available, either from storage or getId / extendId.
     */
    decode: (id: SerializableId, config: UserIdConfig<P>) => DecodedId<P>;
    onDataDeletionRequest?: (config: UserIdConfig<P>, userId: UserId[P], ...cmpArgs: any[]) => void;
    /**
     * Domain to use for cookie storage.
     */
    domainOverride?: () => string;
    /**
     * Return the topmost parent of `fullDomain` (which defaults to the current page) that will allow cookie writes.
     * This method is attached by the base ID module on submodule registration.
     */
    findRootDomain?: (fullDomain?: string) => string;
    eids?: {
        [K in keyof UserId]?: K extends string ? EIDConfig<K> | EIDFn<K, P> : never;
    }
}

declare module '../../src/hook' {
    interface Submodules {
        userId: [IdProviderSpec<UserIdProvider>];
    }
}
