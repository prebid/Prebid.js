import {SYNC_URL} from './constants.js';
import {VIDEO} from '../../src/mediaTypes.js';
import {getRefererInfo} from '../../src/refererDetection.js';
import {createTrackPixelHtml, deepAccess, getBidRequest, formatQS} from '../../src/utils.js';

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

export function formatRequest({payload, url, bidderRequest, bidId}) {
  const request = {
    method: 'POST',
    data: JSON.stringify(payload),
    url,
    options: {
      withCredentials: true,
    }
  }

  if (bidderRequest) {
    request.bidderRequest = bidderRequest;
  }

  if (bidId) {
    request.bidId = bidId;
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

export function bannerBid(serverBid, rtbBid, bidderRequest, margin) {
  const bidRequest = getBidRequest(serverBid.uuid, [bidderRequest]);
  const sizes = getSizes(bidRequest);
  const bid = {
    requestId: serverBid.uuid,
    cpm: rtbBid.cpm / margin,
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

export function videoBid(serverBid, requestId, currency, params, ttl) {
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
    ttl,
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
  return tag && tag.ads && tag.ads.length && tag.ads.find(ad => ad.rtb);
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

export function getSyncResponse(syncOptions, gdprConsent, uspConsent, gppConsent, endpoint) {
  const params = {
    endpoint
  };

  // Attaching GDPR Consent Params in UserSync url
  if (gdprConsent) {
    params.gdpr = (gdprConsent.gdprApplies ? 1 : 0);
    params.gdpr_consent = encodeURIComponent(gdprConsent.consentString || '');
  }

  // CCPA
  if (uspConsent && typeof uspConsent === 'string') {
    params.us_privacy = encodeURIComponent(uspConsent);
  }

  // GPP Consent
  if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
    params.gpp = encodeURIComponent(gppConsent.gppString);
    params.gpp_sid = encodeURIComponent(gppConsent?.applicableSections?.join(','));
  }

  const queryParams = Object.keys(params).length > 0 ? formatQS(params) : '';
  let response = [];
  if (syncOptions.iframeEnabled) {
    response = [{
      type: 'iframe',
      url: SYNC_URL + 'load-cookie.html?' + queryParams
    }];
  }

  return response;
}

export function getSiteObj() {
  const refInfo = (getRefererInfo && getRefererInfo()) || {};

  return {
    page: refInfo.page,
    ref: refInfo.ref,
    domain: refInfo.domain
  }
}
