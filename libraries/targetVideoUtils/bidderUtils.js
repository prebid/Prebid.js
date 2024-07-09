import {BANNER, VIDEO} from "../../src/mediaTypes";
import {find} from "../../src/polyfill";
import {getRefererInfo} from "../../src/refererDetection";
import {createTrackPixelHtml, deepAccess, getBidRequest, logError} from "../../src/utils";
import {BANNER_ENDPOINT_URL, VIDEO_ENDPOINT_URL, MARGIN, TIME_TO_LIVE} from "./constants";

export function getSizes(request) {
  let sizes = request.sizes;
  if (!sizes && request.mediaTypes && request.mediaTypes.banner && request.mediaTypes.banner.sizes) {
    sizes = request.mediaTypes.banner.sizes;
  }
  if (Array.isArray(sizes) && !Array.isArray(sizes[0])) {
    sizes = [sizes[0], sizes[1]];
  }
  if (!Array.isArray(sizes) || !Array.isArray(sizes[0])) {
    sizes = [[0, 0]];
  }

  return sizes;
}

export function formatRequest(payload, requestType, config) {
  const request = {
    method: 'POST',
    data: JSON.stringify(payload),
    options: {
      withCredentials: true,
    }
  }

  switch(requestType) {
    case BANNER:
      request.url = BANNER_ENDPOINT_URL;
      request.bidderRequest = config;
      break;
    case VIDEO:
      request.url = VIDEO_ENDPOINT_URL;
      request.bidId = config;
      break;
    default:
      logError("Unsupported media type");
  }

  return request;
}

export function createVideoTag(bid) {
  const tag = {};
  tag.id = parseInt(bid.params.placementId, 10);
  tag.gpid = 'targetVideo';
  tag.sizes = getSizes(bid);
  tag.primary_size = tag.sizes[0];
  tag.ad_types = [VIDEO];
  tag.uuid = bid.bidId;
  tag.allow_smaller_sizes = false;
  tag.use_pmt_rule = false;
  tag.prebid = true;
  tag.disable_psa = true;
  tag.hb_source = 1;
  tag.require_asset_url = true;
  tag.video = {
    playback_method: 2,
    skippable: true
  };

  return tag;
}

export function bannerBid(serverBid, rtbBid, bidderRequest) {
  const bidRequest = getBidRequest(serverBid.uuid, [bidderRequest]);
  const sizes = getSizes(bidRequest);
  const bid = {
    requestId: serverBid.uuid,
    cpm: rtbBid.cpm / MARGIN,
    creativeId: rtbBid.creative_id,
    dealId: rtbBid.deal_id,
    currency: 'USD',
    netRevenue: true,
    width: sizes[0][0],
    height: sizes[0][1],
    ttl: 300,
    adUnitCode: bidRequest.adUnitCode,
    appnexus: {
      buyerMemberId: rtbBid.buyer_member_id,
      dealPriority: rtbBid.deal_priority,
      dealCode: rtbBid.deal_code
    }
  };

  if (rtbBid.rtb.video) {
    Object.assign(bid, {
      vastImpUrl: rtbBid.notify_url,
      ad: getBannerHtml(rtbBid.notify_url + '&redir=' + encodeURIComponent(rtbBid.rtb.video.asset_url)),
      ttl: 3600
    });
  }

  return bid;
}

export function videoBid(serverBid, requestId, currency, params) {
  const {ad, adUrl, vastUrl, vastXml} = getAd(serverBid);

  const bid = {
    requestId,
    params,
    currency,
    cpm: serverBid.price,
    width: serverBid.w,
    height: serverBid.h,
    creativeId: serverBid.adid || serverBid.crid,
    netRevenue: false,
    ttl: TIME_TO_LIVE,
    meta: {
      advertiserDomains: serverBid.adomain || []
    }
  };

  if (vastUrl || vastXml) {
    bid.mediaType = VIDEO;
    if (vastUrl) bid.vastUrl = vastUrl;
    if (vastXml) bid.vastXml = vastXml;
  } else {
    bid.ad = ad;
    bid.adUrl = adUrl;
  };

  return bid;
}

export function getRtbBid(tag) {
  return tag && tag.ads && tag.ads.length && find(tag.ads, ad => ad.rtb);
}

export function getBannerHtml(vastUrl) {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title></title>
      <style>html, body {width: 100%; height: 100%; margin: 0;}</style>
    </head>
    <body>
      <div id="targetVideoPlayer"></div>
      <script src="https://player.target-video.com/custom/targetvideo-banner.js"></script>
      <script>initPlayer("${vastUrl}");</script>
    </body>
  </html>`;
}

export function getAd(bid) {
  let ad, adUrl, vastXml, vastUrl;

  switch (deepAccess(bid, 'ext.prebid.type')) {
    case VIDEO:
      if (bid.adm.substr(0, 4) === 'http') {
        vastUrl = bid.adm;
      } else {
        vastXml = bid.adm;
      };
      break;
    default:
      if (bid.adm && bid.nurl) {
        ad = bid.adm;
        ad += createTrackPixelHtml(decodeURIComponent(bid.nurl));
      } else if (bid.adm) {
        ad = bid.adm;
      } else if (bid.nurl) {
        adUrl = bid.nurl;
      };
  }

  return {ad, adUrl, vastXml, vastUrl};
}

export function getSiteObj() {
  const refInfo = (getRefererInfo && getRefererInfo()) || {};

  return {
    page: refInfo.page,
    ref: refInfo.ref,
    domain: refInfo.domain
  }
}