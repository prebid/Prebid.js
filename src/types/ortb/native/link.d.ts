import type {Extensible} from "../common.d.ts";

export type Link = Extensible & {
    /**
     * Landing URL of the clickable link.
     */
    url: string;
    /**
     * List of third-party tracker URLs to be fired on click of the URL.
     */
    clicktrackers?: string[];
    /**
     * Fallback URL for deeplink. To be used if the URL given in url is not
     * supported by the device
     */
    fallback?: string;
}
