import { CallHandler, StorageHandler, ErrorDetails, ReadOnlyStorageHandler } from "live-connect-common";
type StorageStrategy = "cookie" | "ls" | "none" | "disabled";
interface IdentityResolutionConfig {
    url?: string;
    expirationHours?: number;
    ajaxTimeout?: number;
    source?: string;
    publisherId?: number;
    requestedAttributes?: string[];
    contextSelectors?: string;
    contextElementsLength?: number;
}
interface LiveConnectConfig {
    appId?: string;
    wrapperName?: string;
    storageStrategy?: StorageStrategy;
    collectorUrl?: string;
    usPrivacyString?: string;
    gdprApplies?: boolean;
    expirationDays?: number;
    identifiersToResolve?: string | string[];
    trackerName?: string;
    identityResolutionConfig?: IdentityResolutionConfig;
    distributorId?: string;
    globalVarName?: string;
}
type ResolutionParams = Record<string, string | string[]>;
// Object fields will be name and value of requested attributes
type IdentityResultionResult = object;
interface HashedEmail {
    md5: string;
    sha1: string;
    sha256: string;
}
interface RetrievedIdentifier {
    name: string;
    value: string;
}
interface ErrorBus {
    emitErrorWithMessage(name: string, message: string, e?: unknown): this;
    emitError(name: string, exception?: unknown): this;
}
interface EventBus extends ErrorBus {
    on<F extends ((event: unknown) => void)>(name: string, callback: F, ctx?: ThisParameterType<F>): this;
    once<F extends ((event: unknown) => void)>(name: string, callback: F, ctx?: ThisParameterType<F>): this;
    emit(name: string, event: unknown): this;
    off(name: string, callback: (event: unknown) => void): this;
}
interface ILiveConnect {
    ready: boolean;
    push: (event: unknown) => void;
    fire: () => void;
    resolve?: (successCallBack: (result: IdentityResultionResult) => void, errorCallBack: () => void, additionalParams?: ResolutionParams) => void;
    resolutionCallUrl?: (additionalParams: ResolutionParams) => string;
    peopleVerifiedId?: string;
    config: LiveConnectConfig;
    eventBus?: EventBus;
}
declare function LiveConnect(liveConnectConfig: LiveConnectConfig, externalStorageHandler: StorageHandler, externalCallHandler: CallHandler, mode: string, externalEventBus?: EventBus): ILiveConnect | null;
declare function MinimalLiveConnect(liveConnectConfig: LiveConnectConfig, externalStorageHandler: ReadOnlyStorageHandler, externalCallHandler: CallHandler, externalEventBus?: EventBus): ILiveConnect;
declare function StandardLiveConnect(liveConnectConfig: LiveConnectConfig, externalStorageHandler: ExternalStorageHandler, externalCallHandler: ExternalCallHandler, externalEventBus?: EventBus): ILiveConnect;
declare namespace eventBus {
    type StorageStrategy = "cookie" | "ls" | "none" | "disabled";
    const StorageStrategies: Record<string, StorageStrategy>;
    interface IdentityResolutionConfig {
        url?: string;
        expirationHours?: number;
        ajaxTimeout?: number;
        source?: string;
        publisherId?: number;
        requestedAttributes?: string[];
        contextSelectors?: string;
        contextElementsLength?: number;
    }
    interface LiveConnectConfig {
        appId?: string;
        wrapperName?: string;
        storageStrategy?: StorageStrategy;
        collectorUrl?: string;
        usPrivacyString?: string;
        gdprApplies?: boolean;
        expirationDays?: number;
        identifiersToResolve?: string | string[];
        trackerName?: string;
        identityResolutionConfig?: IdentityResolutionConfig;
        distributorId?: string;
        globalVarName?: string;
    }
    type ResolutionParams = Record<string, string | string[]>;
    // Object fields will be name and value of requested attributes
    type IdentityResultionResult = object;
    interface HashedEmail {
        md5: string;
        sha1: string;
        sha256: string;
    }
    interface RetrievedIdentifier {
        name: string;
        value: string;
    }
    interface State extends LiveConnectConfig {
        eventSource?: object;
        liveConnectId?: string;
        trackerName?: string;
        pageUrl?: string;
        domain?: string;
        hashesFromIdentifiers?: HashedEmail[];
        decisionIds?: string[];
        peopleVerifiedId?: string;
        errorDetails?: ErrorDetails;
        retrievedIdentifiers?: RetrievedIdentifier[];
        hashedEmail?: HashedEmail[];
        providedHash?: string;
        gdprConsent?: string;
        contextSelectors?: string;
        contextElementsLength?: number;
        contextElements?: string;
        privacyMode?: boolean;
        referrer?: string;
    }
    interface HemStore {
        hashedEmail?: HashedEmail[];
    }
    interface ConfigMismatch {
        appId: (string | undefined)[];
        wrapperName: (string | undefined)[];
        collectorUrl: (string | undefined)[];
    }
    interface ErrorBus {
        emitErrorWithMessage(name: string, message: string, e?: unknown): this;
        emitError(name: string, exception?: unknown): this;
    }
    interface EventBus extends ErrorBus {
        on<F extends ((event: unknown) => void)>(name: string, callback: F, ctx?: ThisParameterType<F>): this;
        once<F extends ((event: unknown) => void)>(name: string, callback: F, ctx?: ThisParameterType<F>): this;
        emit(name: string, event: unknown): this;
        off(name: string, callback: (event: unknown) => void): this;
    }
    interface ILiveConnect {
        ready: boolean;
        push: (event: unknown) => void;
        fire: () => void;
        resolve?: (successCallBack: (result: IdentityResultionResult) => void, errorCallBack: () => void, additionalParams?: ResolutionParams) => void;
        resolutionCallUrl?: (additionalParams: ResolutionParams) => string;
        peopleVerifiedId?: string;
        config: LiveConnectConfig;
        eventBus?: EventBus;
    }
    function LocalEventBus(size?: number): EventBus;
    function GlobalEventBus(name: string, size: number, errorCallback: (error: unknown) => void): EventBus;
    function getAvailableBus(name: string): EventBus;
}
declare namespace consts {
    const EVENT_BUS_NAMESPACE = "__li__evt_bus";
    // reexport for backwards compat
    const ERRORS_PREFIX = "li_errors";
    const PIXEL_SENT_PREFIX = "lips";
    const PRELOAD_PIXEL = "pre_lips";
    const PEOPLE_VERIFIED_LS_ENTRY = "_li_duid";
    const DEFAULT_IDEX_EXPIRATION_HOURS = 1;
    const DEFAULT_IDEX_AJAX_TIMEOUT = 5000;
    const DEFAULT_IDEX_URL = "https://idx.liadm.com/idex";
    const DEFAULT_REQUESTED_ATTRIBUTES: never[]; // legacy behaviour; resolves nonId as unifiedId
}
export { LiveConnect, MinimalLiveConnect, StandardLiveConnect, eventBus, consts };
