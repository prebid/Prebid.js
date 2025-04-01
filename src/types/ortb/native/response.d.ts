// https://www.iab.com/wp-content/uploads/2018/03/OpenRTB-Native-Ads-Specification-Final-1.2.pdf

import type {Extensible} from "../common.d.ts";
import type {EventTrackerResponse} from "./eventtrackers.d.ts";
import type {Link} from './link.d.ts';
import type {AssetResponse} from "./assets.d.ts";

export type NativeResponse = Extensible & {
    /**
     * Version of the Native Markup version in use
     */
    ver?: string
    /**
     * List of native ad’s assets. Required if no assetsurl.
     * Recommended as fallback even if assetsurl is provided.
     */
    assets?: AssetResponse[];
    /**
     * URL of an alternate source for the assets object. The expected
     * response is a JSON object mirroring the assets object in the
     * bid response, subject to certain requirements as specified in the
     * individual objects. Where present, overrides the asset
     * object in the response
     */
    assetsurl?: string
    /**
     * URL where a dynamic creative specification may be found for
     * populating this ad, per the Dynamic Content Ads Specification.
     */
    dcourl?: string;
    /**
     * Destination Link. This is default link object for the ad.
     * Individual assets can also have a link object which applies if the asset is
     * activated(clicked). If the asset doesn’t have a link object, the
     * parent link object applies.
     */
    link: Link;
    /**
     * Array of impression tracking URLs, expected to return a 1x1 image or 204 response.
     * Typically only passed when using 3rd party trackers.
     *
     * @deprecated To be deprecated - replaced with eventtrackers
     */
    imptrackers?: string[];
    /**
     * Optional JavaScript impression tracker. This is a valid HTML, Javascript is already wrapped in
     * <script> tags. It should be executed at impression time where it can be supported.
     *
     * @deprecated To be deprecated - replaced with eventtrackers.
     */
    jstracker?: string;
    /**
     * Array of tracking objects to run with the ad, in response to the
     * declared supported methods in the request.
     */
    eventtrackers?: EventTrackerResponse[];
    /**
     * If support was indicated in the request, URL of a page informing
     * the user about the buyer’s targeting activity.
     */
    privacy?: string;
}
