export function newConfig(): {
    getConfig: (...args: any[]) => any;
    setConfig: (options: any) => void;
    setDefaults: (options: any) => void;
    resetConfig: () => void;
    runWithBidder: (bidder: any, fn: any) => any;
    callbackWithBidder: (bidder: any) => (cb: any) => (...args: any[]) => any;
    setBidderConfig: (config: any) => void;
    getBidderConfig: () => any;
};
export const RANDOM: "random";
export namespace config {
    export { getConfig };
    export { setConfig };
    export { setDefaults };
    export { resetConfig };
    export { runWithBidder };
    export { callbackWithBidder };
    export { setBidderConfig };
    export { getBidderConfig };
}
export type PrebidConfig = {
    url: string;
};
export type MediaTypePriceGranularity = {
    banner?: any;
    native?: any;
    video?: any;
    "video-instream"?: any;
    "video-outstream"?: any;
};
declare function getConfig(...args: any[]): any;
declare function setConfig(options: any): void;
declare function setDefaults(options: any): void;
declare function resetConfig(): void;
declare function runWithBidder(bidder: any, fn: any): any;
declare function callbackWithBidder(bidder: any): (cb: any) => (...args: any[]) => any;
declare function setBidderConfig(config: any): void;
declare function getBidderConfig(): any;
export {};
