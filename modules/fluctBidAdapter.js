import { _each, deepSetValue, isEmpty } from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const BIDDER_CODE = 'fluct';
const END_POINT = 'https://hb.adingo.jp/prebid';
const VERSION = '1.2';
const NET_REVENUE = true;
const TTL = 300;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['adingo'],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    return !!(bid.params.groupId && bid.params.tagId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests} validBidRequests an array of bids.
   * @param {BidderRequest} bidderRequest bidder request object.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    const serverRequests = [];
    const page = bidderRequest.refererInfo.page;

    _each(validBidRequests, (request) => {
      const impExt = request.ortb2Imp?.ext;
      const data = Object();

      data.page = page;
      data.adUnitCode = request.adUnitCode;
      data.bidId = request.bidId;
      data.user = {
        data: bidderRequest.ortb2?.user?.data ?? [],
        eids: [
          ...(request.userIdAsEids ?? []),
          ...(bidderRequest.ortb2?.user?.ext?.eids ?? []),
        ],
      };

      if (impExt) {
        data.transactionId = impExt.tid;
        data.gpid = impExt.gpid ?? impExt.data?.pbadslot ?? impExt.data?.adserver?.adslot;
      }
      if (bidderRequest.gdprConsent) {
        deepSetValue(data, 'regs.gdpr', {
          consent: bidderRequest.gdprConsent.consentString,
          gdprApplies: bidderRequest.gdprConsent.gdprApplies ? 1 : 0,
        });
      }
      if (bidderRequest.uspConsent) {
        deepSetValue(data, 'regs.us_privacy', {
          consent: bidderRequest.uspConsent,
        });
      }
      if (config.getConfig('coppa') === true) {
        deepSetValue(data, 'regs.coppa', 1);
      }

      data.sizes = [];
      _each(request.sizes, (size) => {
        data.sizes.push({
          w: size[0],
          h: size[1]
        });
      });

      data.params = request.params;

      if (request.schain) {
        data.schain = request.schain;
      }

      const searchParams = new URLSearchParams({
        dfpUnitCode: request.params.dfpUnitCode,
        tagId: request.params.tagId,
        groupId: request.params.groupId,
      });

      serverRequests.push({
        method: 'POST',
        url: END_POINT + '?' + searchParams.toString(),
        options: {
          contentType: 'application/json',
          withCredentials: true,
          customHeaders: {
            'x-fluct-app': 'prebid/fluctBidAdapter',
            'x-fluct-version': VERSION,
            'x-openrtb-version': 2.5
          }
        },
        data: data
      });
    });

    return serverRequests;
  },

  /*
   * Unpack the respnse from the server into a list of bids.
   *
   * @param {serverResponse} serverResponse A successful response from the server.
   * @return {bid[]} An array of bids which weer nested inside the server.
   */
  interpretResponse: (serverResponse, serverRequest) => {
    const bidResponses = [];

    const res = serverResponse.body;
    if (!isEmpty(res) && !isEmpty(res.seatbid) && !isEmpty(res.seatbid[0].bid)) {
      const bid = res.seatbid[0].bid[0];
      const dealId = bid.dealid;
      const beaconUrl = bid.burl;
      const callImpBeacon = `<script type="application/javascript">` +
        `(function() { var img = new Image(); img.src = "${beaconUrl}"})()` +
        `</script>`;
      let data = {
        requestId: res.id,
        currency: res.cur,
        cpm: parseFloat(bid.price) || 0,
        netRevenue: NET_REVENUE,
        width: bid.w,
        height: bid.h,
        creativeId: bid.crid,
        ttl: TTL,
        ad: bid.adm + callImpBeacon,
        meta: {
          advertiserDomains: bid.adomain || [],
        },
      };
      if (!isEmpty(dealId)) {
        data.dealId = dealId;
      }
      bidResponses.push(data);
    }
    return bidResponses;
  },

  /*
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @params {syncOptions} syncOptions which user syncs are allowed?
   * @params {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   *
   */
  getUserSyncs: (syncOptions, serverResponses) => {
    // gdpr, us_privacy, and coppa params to be handled on the server end.
    const usersyncs = serverResponses.reduce((acc, serverResponse) => [
      ...acc,
      ...(serverResponse.body.usersyncs ?? []),
    ], []);
    const syncs = usersyncs.filter(
      (sync) => (
        (sync['type'] === 'image' && syncOptions.pixelEnabled) ||
        (sync['type'] === 'iframe' && syncOptions.iframeEnabled)
      )
    ).map((sync) => ({
      type: sync.type,
      url: sync.url,
    }));
    return syncs;
  }
};

registerBidder(spec);
