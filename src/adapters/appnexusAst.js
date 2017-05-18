import Adapter from 'src/adapters/adapter';
import { Renderer } from 'src/Renderer';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';

const ENDPOINT = '//ib.adnxs.com/ut/v2/prebid';
const VIDEO_TARGETING = ['id', 'mimes', 'minduration', 'maxduration',
  'startdelay', 'skippable', 'playback_method', 'frameworks'];
const USER_PARAMS = [
  'age', 'external_uid', 'segments', 'gender', 'dnt', 'language'
];

/**
 * Bidder adapter for /ut endpoint. Given the list of all ad unit tag IDs,
 * sends out a bid request. When a bid response is back, registers the bid
 * to Prebid.js. This adapter supports alias bidding.
 */
function AppnexusAstAdapter() {
  let baseAdapter = Adapter.createNew('appnexusAst');
  let bidRequests = {};
  let usersync = false;

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function(bidRequest) {
    const bids = bidRequest.bids || [];
    var member = 0;
    let userObj;
    const tags = bids
      .filter(bid => valid(bid))
      .map(bid => {
        // map request id to bid object to retrieve adUnit code in callback
        bidRequests[bid.bidId] = bid;

        let tag = {};
        tag.sizes = getSizes(bid.sizes);
        tag.primary_size = tag.sizes[0];
        tag.uuid = bid.bidId;
        if (bid.params.placementId) {
          tag.id = parseInt(bid.params.placementId, 10);
        } else {
          tag.code = bid.params.invCode;
        }
        tag.allow_smaller_sizes = bid.params.allowSmallerSizes || false;
        tag.prebid = true;
        tag.disable_psa = true;
        member = parseInt(bid.params.member, 10);
        if (bid.params.reserve) {
          tag.reserve = bid.params.reserve;
        }
        if (bid.params.position) {
          tag.position = {'above': 1, 'below': 2}[bid.params.position] || 0;
        }
        if (bid.params.trafficSourceCode) {
          tag.traffic_source_code = bid.params.trafficSourceCode;
        }
        if (bid.params.privateSizes) {
          tag.private_sizes = getSizes(bid.params.privateSizes);
        }
        if (bid.params.supplyType) {
          tag.supply_type = bid.params.supplyType;
        }
        if (bid.params.pubClick) {
          tag.pubclick = bid.params.pubClick;
        }
        if (bid.params.extInvCode) {
          tag.ext_inv_code = bid.params.extInvCode;
        }
        if (bid.params.externalImpId) {
          tag.external_imp_id = bid.params.externalImpId;
        }
        if (!utils.isEmpty(bid.params.keywords)) {
          tag.keywords = getKeywords(bid.params.keywords);
        }

        if (bid.mediaType === 'video') { tag.require_asset_url = true; }
        if (bid.params.video) {
          tag.video = {};
          // place any valid video params on the tag
          Object.keys(bid.params.video)
            .filter(param => VIDEO_TARGETING.includes(param))
            .forEach(param => tag.video[param] = bid.params.video[param]);
        }

        if (bid.params.user) {
          userObj = {};
          Object.keys(bid.params.user)
            .filter(param => USER_PARAMS.includes(param))
            .forEach(param => userObj[param] = bid.params.user[param]);
        }

        return tag;
      });

    if (!utils.isEmpty(tags)) {
      const payloadJson = {tags: [...tags], user: userObj};
      if (member > 0) {
        payloadJson.member_id = member;
      }
      const payload = JSON.stringify(payloadJson);
      ajax(ENDPOINT, handleResponse, payload, {
        contentType: 'text/plain',
        withCredentials: true
      });
    }
  };

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    let parsed;

    try {
      parsed = JSON.parse(response);
    } catch (error) {
      utils.logError(error);
    }

    if (!parsed || parsed.error) {
      let errorMessage = `in response for ${baseAdapter.getBidderCode()} adapter`;
      if (parsed && parsed.error) { errorMessage += `: ${parsed.error}`; }
      utils.logError(errorMessage);

      // signal this response is complete
      Object.keys(bidRequests)
        .map(bidId => bidRequests[bidId].placementCode)
        .forEach(placementCode => {
          bidmanager.addBidResponse(placementCode, createBid(STATUS.NO_BID));
        });
      return;
    }

    parsed.tags.forEach(tag => {
      const ad = getRtbBid(tag);
      const cpm = ad && ad.cpm;
      const type = ad && ad.ad_type;

      let status;
      if (cpm !== 0 && (type === 'banner' || type === 'video' || type === 'video-outstream')) {
        status = STATUS.GOOD;
      } else {
        status = STATUS.NO_BID;
      }

      if (type && (type !== 'banner' && type !== 'video' && type !== 'video-outstream')) {
        utils.logError(`${type} ad type not supported`);
      }

      tag.bidId = tag.uuid;  // bidfactory looks for bidId on requested bid
      const bid = createBid(status, tag);
      if (type === 'video') bid.mediaType = 'video';
      if (type === 'video-outstream') bid.mediaType = 'video-outstream';
      const placement = bidRequests[bid.adId].placementCode;
      bidmanager.addBidResponse(placement, bid);
    });

    if (!usersync) {
      const iframe = utils.createInvisibleIframe();
      iframe.src = '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html';
      try {
        document.body.appendChild(iframe);
      } catch (error) {
        utils.logError(error);
      }
      usersync = true;
    }
  }

  /* Check that a bid has required paramters */
  function valid(bid) {
    if (bid.params.placementId || bid.params.member && bid.params.invCode) {
      return bid;
    } else {
      utils.logError('bid requires placementId or (member and invCode) params');
    }
  }

  /* Turn keywords parameter into ut-compatible format */
  function getKeywords(keywords) {
    let arrs = [];

    utils._each(keywords, (v, k) => {
      if (utils.isArray(v)) {
        let values = [];
        utils._each(v, (val) => {
          val = utils.getValueString('keywords.' + k, val);
          if (val) { values.push(val); }
        });
        v = values;
      } else {
        v = utils.getValueString('keywords.' + k, v);
        if (utils.isStr(v)) { v = [v]; } else { return; } // unsuported types - don't send a key
      }
      arrs.push({key: k, value: v});
    });

    return arrs;
  }

  /* Turn bid request sizes into ut-compatible format */
  function getSizes(requestSizes) {
    let sizes = [];
    let sizeObj = {};

    if (utils.isArray(requestSizes) && requestSizes.length === 2 &&
       !utils.isArray(requestSizes[0])) {
      sizeObj.width = parseInt(requestSizes[0], 10);
      sizeObj.height = parseInt(requestSizes[1], 10);
      sizes.push(sizeObj);
    } else if (typeof requestSizes === 'object') {
      for (let i = 0; i < requestSizes.length; i++) {
        let size = requestSizes[i];
        sizeObj = {};
        sizeObj.width = parseInt(size[0], 10);
        sizeObj.height = parseInt(size[1], 10);
        sizes.push(sizeObj);
      }
    }

    return sizes;
  }

  function getRtbBid(tag) {
    return tag && tag.ads && tag.ads.length && tag.ads.find(ad => ad.rtb);
  }

  function outstreamRender(bid) {
    window.ANOutstreamVideo.renderAd({
      tagId: bid.adResponse.tag_id,
      sizes: [bid.getSize().split('x')],
      targetId: bid.adUnitCode, // target div id to render video
      uuid: bid.adResponse.uuid,
      adResponse: bid.adResponse,
      rendererOptions: bid.renderer.getConfig()
    }, handleOutstreamRendererEvents.bind(bid));
  }

  function onOutstreamRendererLoaded() {
    // setup code for renderer, if any
  }

  function handleOutstreamRendererEvents(id, eventName) {
    const bid = this;
    bid.renderer.handleVideoEvent({ id, eventName });
  }

  /* Create and return a bid object based on status and tag */
  function createBid(status, tag) {
    const ad = getRtbBid(tag);
    let bid = bidfactory.createBid(status, tag);
    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = baseAdapter.getBidderCode();

    if (ad && status === STATUS.GOOD) {
      bid.cpm = ad.cpm;
      bid.creative_id = ad.creative_id;
      bid.dealId = ad.deal_id;

      if (ad.rtb.video) {
        bid.width = ad.rtb.video.player_width;
        bid.height = ad.rtb.video.player_height;
        bid.vastUrl = ad.rtb.video.asset_url;
        bid.descriptionUrl = ad.rtb.video.asset_url;
        if (ad.renderer_url) {
          // outstream video

          bid.adResponse = tag;
          bid.renderer = Renderer.install({
            id: ad.renderer_id,
            url: ad.renderer_url,
            config: { adText: `AppNexus Outstream Video Ad via Prebid.js` },
            callback: () => onOutstreamRendererLoaded.call(null, bid)
          });

          try {
            bid.renderer.setRender(outstreamRender);
          } catch (err) {
            utils.logWarning('Prebid Error calling setRender on renderer', err);
          }

          bid.renderer.setEventHandlers({
            impression: () => utils.logMessage('AppNexus outstream video impression event'),
            loaded: () => utils.logMessage('AppNexus outstream video loaded event'),
            ended: () => {
              utils.logMessage('AppNexus outstream renderer video event');
              document.querySelector(`#${bid.adUnitCode}`).style.display = 'none';
            }
          });

          bid.adResponse.ad = bid.adResponse.ads[0];
          bid.adResponse.ad.video = bid.adResponse.ad.rtb.video;
        }
      } else {
        bid.width = ad.rtb.banner.width;
        bid.height = ad.rtb.banner.height;
        bid.ad = ad.rtb.banner.content;
        try {
          const url = ad.rtb.trackers[0].impression_urls[0];
          const tracker = utils.createTrackPixelHtml(url);
          bid.ad += tracker;
        } catch (error) {
          utils.logError('Error appending tracking pixel', error);
        }
      }
    }

    return bid;
  }

  return {
    createNew: AppnexusAstAdapter.createNew,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
  };
}

AppnexusAstAdapter.createNew = function() {
  return new AppnexusAstAdapter();
};

module.exports = AppnexusAstAdapter;
