// https://www.iab.com/wp-content/uploads/2018/03/OpenRTB-Native-Ads-Specification-Final-1.2.pdf

import type {Extensible} from "../common.d.ts";

/**
 * Type of event to track.
 * 1 = impression;
 * 2 = Visible impression using MRC definition at 50% in view for 1 second;
 * 3 = 100% in view for 1 second (ie GroupM standard);
 * 4 = Visible impression for video using MRC definition at 50% in view for 2 seconds;
 * 500+ is exchange specific.
 * When used in `bidResponse.eventtrackers`, prebid takes 500 to mean "bid won".
 */
type Event = number;

/**
 * Type of tracking requested.
 * 1 = Image-pixel tracking - URL provided will be inserted as a 1x1 pixel at the time of the event;
 * 2 = Javascript-based tracking - URL provided will be inserted as a js tag at the time of the event;
 * 500+ is exchange specific.
 */
type Method = number;

/**
 * The event trackers response is an array of objects and specifies the types of events the bidder
 * wishes to track and the URLs/information to track them
 */
export type EventTrackerResponse = Extensible & {
    /**
     * @see Event
     */
    event: Event;
    /**
     * @see Method
     */
    method: Method;
    /**
     * The URL of the image or js. Required for image or js,
     * optional for custom.
     */
    url?: string;
    /**
     * To be agreed individually with the exchange, an array of
     * key:value objects for custom tracking, for example the
     * account number of the DSP with a tracking company. IE
     * {“accountnumber”:”123”}.
     */
    customdata?: { [key: string]: string };
}
