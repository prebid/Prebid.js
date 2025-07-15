// https://iabtechlab.com/wp-content/uploads/2021/03/DemandChainObject-1-0.pdf

import type {BooleanInt, Extensible} from "../common.d.ts";

export type DemandChainNode = Extensible & {
  /**
   * The canonical domain name of the DSP or other buyer system
   * that is generating the bid response. This should be the same
   * location that hosts a buyers.json file.
   * This field is required for any ASI that is involved in the
   * programmatic demand chain, but may be omitted for buy-side
   * entities involved in the payment flow prior to reaching the
   * first DSP.
   * If present, must be a hostname or domain, not full URL.
   * Correct: domain.com.
   * Incorrect: https://domain.com.
   */
  asi?: string;
  /**
   * The identifier associated with the buyer seat within the
   * advertising system. This must contain the same value, if any,
   * used in transactions (i.e. BidResponse.SeatBid.Seat in
   * OpenRTB bid responses), and must be a value that appears as
   * a buyer_id in the buyers.json file. Should be limited to 64
   * characters in length.
   * This field is required for any ASI that is involved in the
   * programmatic demand chain, but may be omitted when the
   * asi itself is omitted, that is for buy-side entities involved in the
   * payment flow prior to reaching the first DSP
   */
  bsid?: string;
  /**
   * The OpenRTB bid request or auction ID (i.e. BidRequest.id) of
   * the request as issued by this seller.
   */
  rid?: string;
  /**
   * The name of the company (the legal entity) that is paying
   * under the given bsid. This value is recommended but should
   * NOT be included if it exists in the advertising system’s
   * buyers.json file (and is not marked confidential there). It
   * MUST be included if the asi is absent or null.
   */
  name?: string;
  /**
   * The business domain name of the entity represented by this
   * node. This value is recommended but should NOT be included
   * if it exists in the advertising system’s buyers.json file (and is
   * not marked confidential there). It MUST be included if the asi
   * is absent or null, unless the buyer has literally no web presence.
   */
  domain?: string;
}

export type DemandChain = Extensible & {
  /**
   * Flag indicating whether the chain contains all nodes involved
   * in the transaction leading back to the originator and ultimate
   * source of payment for the creative, where 0 = no, 1 = yes.
   */
  complete: BooleanInt;
  /**
   * Array of DemandChainNode objects in the order of the chain.
   * In a complete demand chain, the first node represents the
   * initial advertising system and buyer ID involved in the
   * transaction, i.e. the originator and ultimate source of
   * payment for the creative. In an incomplete demand chain, it
   * represents the first known node. The last node represents
   * the entity sending this bid response.
   */
  nodes: DemandChainNode[];
  /**
   * Version of the DemandChain specification in use, in the
   * format of “major.minor”. For example, for version 1.0 of the
   * spec, use the string “1.0” (numeric values are invalid)
   */
  ver: string;
}
