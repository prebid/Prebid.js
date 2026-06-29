import type { BidRequest } from "../../src/adapterManager";
import type { Bid } from "../../src/bidfactory";
import type { BidderCode } from "../../src/types/common";

export type DebugModuleConfiguration = {
  enabled?: boolean;
  /**
   * Rules are evaluated on each bid in the order they are provided: the first one that has a matching when definition takes the bid out of the normal auction flow and replaces it according to its then definition.
   */
  intercept?: InterceptRule[]
};

export type InterceptRule = {
  /**
   * Decides which bids should be intercepted by this rule
   */
  when: MatchRule;
  /**
   * Decides the contents of the bids that are intercepted by this rule
   */
  then?: ReplaceRule;
  options?: RuleOptions;
};

  type MatchRule =
    /**
     * The match rule can be provided as a function that takes the bid request as its only argument and returns `true` if the bid should be intercepted, `false` otherwise.
     */
    | ((bidRequest: BidRequest<BidderCode | null>) => boolean)
    /**
     * Alternatively, the rule can be expressed as an `object`, and it matches if for each key-value pair:
     * - `bidRequest[key] === value`, or
     * - `value` is a function and `value(bidRequest[key])` is `true`, or
     * - `value` is a regular expression and it matches `bidRequest[key]`.
     */
    | {
      [K in keyof BidRequest<BidderCode | null>]?: BidRequest<BidderCode | null>[K] | ((value: BidRequest<BidderCode | null>[K]) => boolean) | RegExp
    };

  type ReplaceRule =
    /**
     * The replace rule can be provided as a function that takes the bid request as its only argument and returns an object with the desired response properties.
     * The function can return `null` to indicate that there is no bid.
     */
    | ((bidRequest: BidRequest<BidderCode | null>) => Partial<Bid> | null)
    /**
     * Alternatively, the rule can be expressed as an `object`, and its key-value pairs will appear in the response as follows:
     * - if `value` is a function, then `bidResponse[key]` will be set to `value(bidRequest)`;
     * - otherwise, `bidResponse[key]` will be set to `value`.
     */
    | {
      [K in keyof Bid]?: Bid[K] | ((request: BidRequest<BidderCode | null>) => Bid[K]);
    }
    /**
     * Indicates no bid.
     */
    | null;

  type RuleOptions = {
    /**
     * Delay (in milliseconds) before intercepted bids are injected into the auction.
     * Can be used to simulate network latency.
     *
     * Defaults to zero.
     */
    delay?: number
  };

declare module '../../src/config' {
  interface Config {
    /**
     * This module allows to “intercept” bids and replace their contents with arbitrary data for the purposes of testing and development.
     *
     * Bids intercepted in this way are never seen by bid adapters or their backend SSPs, but they are nonetheless injected into the auction as if they originated from them.
     */
    debugging?: DebugModuleConfiguration;
  }
}

export {};
