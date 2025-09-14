import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import {sizesToSizeTuples} from "../src/utils.js";

const BIDDER_CODE = 'scalibur';
const ENDPOINT_SERVER = new URLSearchParams(window.location.search).get('sclServer') || 'srv';
const ENDPOINT_URL = `https://${ENDPOINT_SERVER}.scalibur.io/adserver/ortb?type=prebid`;
const SYNC_IFRAME_URL = `https://${ENDPOINT_SERVER}.scalibur.io/adserver/sync`;
const SYNC_PIXEL_URL = `https://${ENDPOINT_SERVER}.scalibur.io/adserver/sync`;
const DEFAULT_CURRENCY = 'USD';
const BIDDER_VERSION = '1.0.0';
const IFRAME_TYPE_Q_PARAM = 'iframe';
const IMAGE_TYPE_Q_PARAM = 'img';
const GVLID = 1471;

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.placementId);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const ortb2 = bidderRequest.ortb2 || {};
    const ortb2Site = ortb2.site || {};
    const ortb2User = ortb2.user || {};
    const ortb2Regs = ortb2.regs || {};
    const ortb2SourceExt = ortb2.source?.ext || {};
    const eids = ortb2User?.ext?.eids || [];

    const payload = {
      id: bidderRequest.auctionId,
      imp: validBidRequests.map((bid) => {
        const imp = {
          id: bid.bidId,
          ext: {
            placementId: bid.params.placementId,
            adUnitCode: bid.adUnitCode,
            ...bid.params,
          },
        };

        // Banner Media Type
        if (bid.mediaTypes.banner) {
          imp.banner = {
            format: sizesToSizeTuples(bid.mediaTypes.banner.sizes).map((size) => ({
              w: size[0],
              h: size[1],
            })),
          };
        }

        // Video Media Type
        if (bid.mediaTypes.video) {
          const video = bid.mediaTypes.video;
          imp.video = {
            mimes: video.mimes || ['video/mp4'],
            minduration: video.minduration || 1,
            maxduration: video.maxduration || 180,
            maxbitrate: video.maxbitrate || 30000,
            protocols: video.protocols || [2, 3, 5, 6],
            w: video.playerSize?.[0]?.[0] || 640,
            h: video.playerSize?.[0]?.[1] || 480,
            placement: video.placement || 1,
            plcmt: video.plcmt || 1,
            skip: video.skip || 0,
            skipafter: video.skipafter || 5,
            startdelay: video.startdelay || 0,
            playbackmethod: video.playbackmethod || [1, 2],
            api: video.api || [1, 2],
            linearity: video.linearity || 1,
          };

          // OMID Params
          if (video.api && video.api.includes(7)) {
            if (ortb2SourceExt.omidpn) {
              imp.video.omidpn = ortb2SourceExt.omidpn;
            }
            if (ortb2SourceExt.omidpv) {
              imp.video.omidpv = ortb2SourceExt.omidpv;
            }
          }
        }

        // Floor Price
        const floor = bid.getFloor ? bid.getFloor({currency: DEFAULT_CURRENCY, mediaType: '*', size: '*'}) : {};
        imp.bidfloor = floor.floor || bid.params.bidfloor || 0;
        imp.bidfloorcur = floor.currency || bid.params.bidfloorcur || DEFAULT_CURRENCY;

        // GPID
        if (bid.ortb2Imp?.ext?.gpid) {
          imp.ext.gpid = bid.ortb2Imp.ext.gpid;
        }

        return imp;
      }),
      site: {
        page: bidderRequest.refererInfo.page,
        domain: bidderRequest.refererInfo.domain,
        ref: ortb2Site.ref || '',
        keywords: ortb2Site.keywords || '',
        pagecat: ortb2Site.pagecat || [],
        content: ortb2Site.content || {},
      },
      device: {
        ua: navigator.userAgent,
        language: navigator.language,
        sua: navigator.userAgentData || {},
        dnt: (navigator.doNotTrack === 'yes' || navigator.doNotTrack === '1' || navigator.msDoNotTrack === '1') ? 1 : 0,
      },
      user: {
        eids,
        consent: bidderRequest.gdprConsent?.consentString || '',
        data: ortb2User.data || [],
      },
      regs: {
        coppa: ortb2Regs.coppa || 0,
        gdpr: bidderRequest.gdprConsent?.gdprApplies ? 1 : 0,
        us_privacy: bidderRequest.uspConsent || '',
        gpp: bidderRequest.gppConsent?.gppString || '',
        gpp_sid: bidderRequest.gppConsent?.applicableSections || [],
        ext: {
          gpc: ortb2Regs.ext?.gpc || '',
        },
      },
      source: {
        tid: bidderRequest.auctionId,
      },
      tmax: bidderRequest.timeout,
      ext: {
        prebidVersion: '$prebid.version$',
        bidderVersion: BIDDER_VERSION,
        isDebug: config.getConfig('debug'),
      }
    };

    // Supply Chain
    if (validBidRequests[0]?.ortb2?.source?.ext?.schain) {
      payload.source.schain = validBidRequests[0]?.ortb2?.source?.ext?.schain;
    }

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payload,
    };
  },

  interpretResponse: function (serverResponse, request) {
    if (!serverResponse || !serverResponse.body) {
      return [];
    }

    const bidResponses = [];
    const response = serverResponse.body;

    if (response && response.seatbid) {
      response.seatbid.forEach((seat) => {
        seat.bid.forEach((bid) => {
          const imp = request.data.imp.find((i) => i.id === bid.impid);
          let bidRes = {
            requestId: bid.impid,
            cpm: bid.cpm,
            width: bid.width,
            height: bid.height,
            creativeId: bid.crid || '',
            currency: response.cur || DEFAULT_CURRENCY,
            netRevenue: true,
            ttl: bid.exp || 300,
          };
          if (imp && imp.banner) {
            bidRes.ad = bid.adm;
            bidRes.mediaType = BANNER;
          } else if (imp && imp.video) {
            bidRes.vastXml = bid.vastXml;
            bidRes.vastUrl = bid.vastUrl;
            bidRes.mediaType = VIDEO;
          }

          bidResponses.push(bidRes);
        });
      });
    }
    return bidResponses;
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    const gdpr = gdprConsent?.gdprApplies ? 1 : 0;
    const gdprConsentString = gdprConsent?.consentString || '';
    const gpp = gdprConsent?.gppString || '';
    const gppSid = gdprConsent?.applicableSections || [];
    const usPrivacy = uspConsent || '';

    const queryParams = [
      `type=${syncOptions.iframeEnabled ? IFRAME_TYPE_Q_PARAM : (syncOptions.pixelEnabled ? IMAGE_TYPE_Q_PARAM : '')}`,
      `gdpr=${gdpr}`,
      `gdpr_consent=${encodeURIComponent(gdprConsentString)}`,
      `us_privacy=${encodeURIComponent(usPrivacy)}`,
      `gpp=${encodeURIComponent(gpp)}`,
      `gpp_sid=${encodeURIComponent(gppSid.join(','))}`,
    ].join('&');

    const syncs = [];
    if (syncOptions.iframeEnabled) {
      syncs.push({type: 'iframe', url: `${SYNC_IFRAME_URL}?${queryParams}`});
    }
    if (syncOptions.pixelEnabled) {
      syncs.push({type: 'image', url: `${SYNC_PIXEL_URL}?${queryParams}`});
    }
    return syncs;
  },
};

registerBidder(spec);
