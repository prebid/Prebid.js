import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getAdUnitSizes, parseSizesInput} from '../src/utils.js';
import {includes} from '../src/polyfill.js';

const BIDDER_CODE = 'between';
let ENDPOINT = 'https://ads.betweendigital.com/adjson?t=prebid';
const CODE_TYPES = ['inpage', 'preroll', 'midroll', 'postroll'];

export const spec = {
  code: BIDDER_CODE,
  aliases: ['btw'],
  supportedMediaTypes: ['banner', 'video'],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True  if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return Boolean(bid.params.s);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequest?pbjs_debug=trues[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    let requests = [];
    const gdprConsent = bidderRequest && bidderRequest.gdprConsent;
    const refInfo = bidderRequest?.refererInfo;

    validBidRequests.forEach((i) => {
      const video = i.mediaTypes && i.mediaTypes.video;

      let params = {
        eids: getUsersIds(i),
        sizes: parseSizesInput(getAdUnitSizes(i)),
        jst: 'hb',
        ord: Math.random() * 10000000000000000,
        tz: getTz(),
        fl: getFl(),
        rr: getRr(),
        s: i.params && i.params.s,
        bidid: i.bidId,
        transactionid: i.transactionId,
        auctionid: i.auctionId
      };

      if (video) {
        params.mediaType = 2;
        params.maxd = video.maxd;
        params.mind = video.mind;
        params.pos = 'atf';
        params.jst = 'pvc';
        params.codeType = includes(CODE_TYPES, video.codeType) ? video.codeType : 'inpage';
      }

      if (i.params.itu !== undefined) {
        params.itu = i.params.itu;
      }
      if (i.params.cur !== undefined) {
        params.cur = i.params.cur;
      }
      if (i.params.subid !== undefined) {
        params.subid = i.params.subid;
      }
      if (i.params.click3rd !== undefined) {
        params.click3rd = i.params.click3rd;
      }
      if (i.params.pubdata !== undefined) {
        for (let key in i.params.pubdata) {
          params['pubside_macro[' + key + ']'] = encodeURIComponent(i.params.pubdata[key]);
        }
      }

      if (i.schain) {
        params.schain = encodeToBase64WebSafe(JSON.stringify(i.schain));
      }

      // TODO: is 'page' the right value here?
      if (refInfo && refInfo.page) params.ref = refInfo.page;

      if (gdprConsent) {
        if (typeof gdprConsent.gdprApplies !== 'undefined') {
          params.gdprApplies = !!gdprConsent.gdprApplies;
        }
        if (typeof gdprConsent.consentString !== 'undefined') {
          params.consentString = gdprConsent.consentString;
        }
      }

      requests.push({data: params})
    })
    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(requests)
    }
    // return requests;
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];

    for (var i = 0; i < serverResponse.body.length; i++) {
      let bidResponse = {
        requestId: serverResponse.body[i].bidid,
        cpm: serverResponse.body[i].cpm || 0,
        width: serverResponse.body[i].w,
        height: serverResponse.body[i].h,
        vastXml: serverResponse.body[i].vastXml,
        mediaType: serverResponse.body[i].mediaType,
        ttl: serverResponse.body[i].ttl,
        creativeId: serverResponse.body[i].creativeid,
        currency: serverResponse.body[i].currency || 'USD',
        netRevenue: serverResponse.body[i].netRevenue || true,
        ad: serverResponse.body[i].ad,
        meta: {
          advertiserDomains: serverResponse.body[i].adomain ? serverResponse.body[i].adomain : []
        }
      };

      bidResponses.push(bidResponse);
    }
    return bidResponses;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function(syncOptions, serverResponses) {
    let syncs = []
    /* console.log(syncOptions,serverResponses)
     if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: 'https://acdn.adnxs.com/dmp/async_usersync.html'
      });
    }
     if (syncOptions.pixelEnabled && serverResponses.length > 0) {
      syncs.push({
        type: 'image',
        url: serverResponses[0].body.userSync.url
      });
    } */

    // syncs.push({
    //   type: 'iframe',
    //   url: 'https://acdn.adnxs.com/dmp/async_usersync.html'
    // });
    syncs.push(
      {
        type: 'iframe',
        url: 'https://ads.betweendigital.com/sspmatch-iframe'
      },
      {
        type: 'image',
        url: 'https://ads.betweendigital.com/sspmatch'
      }
    );
    return syncs;
  }
}

function getUsersIds({ userIdAsEids }) {
  return (userIdAsEids && userIdAsEids.length !== 0) ? userIdAsEids : [];
}

function getRr() {
  try {
    var td = top.document;
    var rr = td.referrer;
  } catch (err) { return false }

  if (typeof rr != 'undefined' && rr.length > 0) {
    return encodeURIComponent(rr);
  } else if (typeof rr != 'undefined' && rr == '') {
    return 'direct';
  }
}

function getFl() {
  if (navigator.plugins !== undefined && navigator.plugins !== null) {
    if (navigator.plugins['Shockwave Flash'] !== undefined && navigator.plugins['Shockwave Flash'] !== null && typeof navigator.plugins['Shockwave Flash'] === 'object') {
      var description = navigator.plugins['Shockwave Flash'].description;
      if (description && !(navigator.mimeTypes !== undefined && navigator.mimeTypes['application/x-shockwave-flash'] && !navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin)) {
        description = description.replace(/^.*\s+(\S+\s+\S+$)/, '$1').replace(/^(.*)\..*$/, '$1');

        return parseInt(description, 10);
      }
    }
  }

  return 0;
}

function getTz() {
  return new Date().getTimezoneOffset();
}

function encodeToBase64WebSafe(string) {
  return btoa(string).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/*
function get_pubdata(adds) {
  if (adds !== undefined && adds.pubdata !== undefined) {
    let index = 0;
    let url = '';
    for(var key in adds.pubdata) {
      if (index == 0) {
        url = url + encodeURIComponent('pubside_macro[' + key + ']') + '=' + encodeURIComponent(adds.pubdata[key]);
        index++;
      } else {
        url = url + '&' + encodeURIComponent('pubside_macro[' + key + ']') + '=' + encodeURIComponent(adds.pubdata[key]);
      }
    }
    return url;
  }
}
*/

registerBidder(spec);
