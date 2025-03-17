import type {BooleanInt, Extensible} from "../common.d.ts";
import type {Link} from "./link.d.ts";

type BaseAssetResponse = Extensible & {
    /**
     * Optional if assetsurl/dcourl is being used; required if embedded asset is being used.
     */
    id?: number;
    /**
     * Set to 1 if asset is required. (bidder requires it to be displayed).
     */
    required?: BooleanInt;
    /**
     * Link object for call to actions. The link object applies if the
     * asset item is activated (clicked). If there is no link object on the
     * asset, the parent link object on the bid response applies.
     */
    link?: Link;
    img: void;
    data: void;
    video: void;
    title: void;
};

export type TitleAssetResponse = Omit<BaseAssetResponse, 'title'> & {
    title: Extensible & {
        /**
         * The text associated with the text
         * element.
         */
        text: string;
        /**
         * The length of the title being provided. Required if using assetsurl/dcourl representation,
         * optional if using embedded asset representation.
         */
        len?: number;
    }
}

/**
 * 1 = Icon
 * 2 = Main
 * 500+ = Exchange specific
 */
export type ImageAssetType = number;

export type ImageAssetResponse = Omit<BaseAssetResponse, 'img'> & {
    img: Extensible & {
        /**
         * Required for assetsurl or dcourl responses, not required for
         * embedded asset responses.
         */
        type?: ImageAssetType;
        /**
         * URL of the image asset.
         */
        url: string;
        /**
         * Width of the image in pixels.
         * Recommended for embedded asset responses.
         * Required for assetsurl/dcourlresponses if multiple assets of same type submitted.
         */
        w?: number;
        /**
         * Height of the image in pixels.
         * Recommended for embedded asset responses.
         * Required for assetsurl/dcourlresponses if multiple assets of same type submitted.
         */
        h?: number;
    }
}

/**
 * 1 = sponsored; Sponsored By message where response should contain the brand name of the sponsor.
 * 2 = desc; Descriptive text associated with the product or service being advertised.
 *           Longer length of text in responses may be truncated or ellipsed by the exchange.
 * 3 = rating; Rating of the product being offered to the user. For example an app’s rating in an app store from 0-5.
 * 4 = likes; Number of social ratings or “likes” of the product being offered to the user.
 * 5 = downloads; Number downloads/installs of this product.
 * 6 = price; Price for product / app / in-app purchase. Value should include currency symbol in localised format.
 * 7 = saleprice; Sale price that can be used together with price to indicate a discounted price compared to a regular price.
 *                Value should include currency symbol in localised format.
 * 8 = phone; phone number.
 * 9 = address; address.
 * 10 = desc2; Additional descriptive text associated with the product or service being advertised.
 * 11 = displayurl; Display URL for the text ad. To be used when sponsoring entity doesn’t own the content.
 *                  IE sponsored by BRAND on SITE (where SITE is transmitted in this field)
 * 12 = ctatext; CTA description - descriptive text describing a ‘call to action’ button for the destination URL.
 * 500+: exchange-specific.
 */
export type DataAssetType = number;

export type DataAssetResponse = Omit<BaseAssetResponse, 'data'> & {
    data: Extensible & {
        /**
         * Required for assetsurl/dcourl responses, not required for embedded asset responses.
         */
        type?: DataAssetType;
        /**
         * Required for assetsurl/dcourl responses, not required for embedded asset responses.
         * The length of the data element being submitted.
         */
        len?: number;
        /**
         * The formatted string of data to be displayed. Can contain a formatted value such as “5 stars”
         * or “$10” or “3.4 stars out of 5”.
         */
        value: string;
    }
}


export type VideoAssetResponse = Omit<BaseAssetResponse, 'video'> & {
    // note that according to the spec, video has no `.ext`
    video: {
        /**
         * vast xml.
         */
        vasttag: string;
    }
}

export type AssetResponse = TitleAssetResponse | ImageAssetResponse | VideoAssetResponse | DataAssetResponse;
