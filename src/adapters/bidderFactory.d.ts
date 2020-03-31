export function registerBidder(spec: BidderSpec): void;

export function newBidder(spec: BidderSpec): any;

export function preloadBidderMappingFile(fn: any, adUnits: any): any;

export function getIabSubCategory(bidderCode: string, category: string): any;

export function isValid(adUnitCode: string, bid: Partial<BidRequest<any>>, bidderRequests: BidderRequest[]): boolean;

import { MediaType } from "../mediaTypes";

export type BidderSpec<BidParams = {[key: string] : any}, RequestData = any, ResponseBody = any> = {
    code: string;
    aliases?: string[];
    supportedMediaTypes?: MediaType[];
    isBidRequestValid: (bidRequest: BidRequest<BidParams>) => boolean;
    buildRequests: (bidRequest: BidRequest<BidParams>[], bidderRequest: BidderRequest) => ServerRequest<RequestData> | ServerRequest<RequestData>[];
    interpretResponse: (response: ServerResponse<ResponseBody>, request: ServerRequest<RequestData>) => BidResponse[];
    getUserSyncs?: (syncOptions: SyncOptions, responses: ServerResponse<ResponseBody>[]) => UserSync[];
};

export type BidRequest<Params> = {
    bidder: string,
    bidId: string;
    bidderRequestId: string;
    adUnitCode: string;
    transactionId: string;
    auctionId: string;
    params: Params;
    mediaTypes: {
        banner?: {
            sizes: Array<[number, number]>
        },
        native?: any;
        video?: any;
    };
    src: "client" | "s2s";
    bidRequestsCount: number;
    bidderRequestsCount: number;
    bidderWinsCount: number;
};

export type BidderRequest = {
    bidderCode: string;
    auctionId: number;
    bidderRequestId: string;
    bids: any[];
    auctionStart: number;
    timeout: number;
    tid?: string;
    src?: string;
    refererInfo: {
        referer: string;
        reachedTop: boolean;
        numIframes: number;
        stack: string[];
        canonicalUrl?: string;
    };
    gdprConsent?: {
        consentString?: string;
        vendorData?: any;
        gdprApplies: boolean;
    },
    uspConsent?: string
};

export type ServerRequest<T> = {
    method: "POST" | "GET";
    url: string;
    data: T;
    options?: {
        withCredentials?: boolean;
        preflight?: boolean;
        contentType?: string;
        customHeaders?: {[header: string]: string},
        noDecodeWholeURL?: boolean;
    };
};

export type ServerResponse<T> = {
    body: T;
    headers: {
        get: (arg0: string) => string;
    };
};

export type BidResponse = {
    requestId: string;
    ad: string;
    currency: string;
    creativeId: string | number;
    cpm: number;
    ttl: number;
    netRevenue: boolean;
    height: number;
    width: number;
    mediaType: MediaType;
    dealId?: string | number;
    video?: any;
    native?: any;
    meta?: {
        iabSubCatId?: string;
    };
    Renderer?: any;
};

export type SyncOptions = {
    iframeEnabled: boolean;
    pixelEnabled: boolean;
};

export type UserSync = {
    type: "iframe" | "image";
    url: string;
};
