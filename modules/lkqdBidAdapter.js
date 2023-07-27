import { logError, _each, generateUUID, buildUrl } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'lkqd';
const BID_TTL_DEFAULT = 300;
const MIMES_TYPES = ['application/x-mpegURL', 'video/mp4', 'video/H264'];
const PROTOCOLS = [1, 2, 3, 4, 5, 6, 7, 8];

const PARAM_VOLUME_DEFAULT = '100';
const DEFAULT_SIZES = [[640, 480]];

function calculateSizes(VIDEO_BID, bid) {
  const userProvided = bid.sizes && Array.isArray(bid.sizes) ? (Array.isArray(bid.sizes[0]) ? bid.sizes : [bid.sizes]) : DEFAULT_SIZES;
  const preBidProvided = VIDEO_BID.playerSize && Array.isArray(VIDEO_BID.playerSize) ? (Array.isArray(VIDEO_BID.playerSize[0]) ? VIDEO_BID.playerSize : [VIDEO_BID.playerSize]) : null;

  return preBidProvided || userProvided;
}

function isSet(value) {
  return value != null;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: [],
  supportedMediaTypes: [VIDEO],
  isBidRequestValid: function(bid) {
    return bid.bidder === BIDDER_CODE && bid.params && Object.keys(bid.params).length > 0 &&
      ((isSet(bid.params.publisherId) && parseInt(bid.params.publisherId) > 0) || (isSet(bid.params.placementId) && parseInt(bid.params.placementId) > 0)) &&
      bid.params.siteId != null;
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const BIDDER_REQUEST = bidderRequest || {};
    const serverRequestObjects = [];
    const UTC_OFFSET = new Date().getTimezoneOffset();
    const UA = navigator.userAgent;
    const USP = BIDDER_REQUEST.uspConsent || null;
    // TODO: does the fallback make sense here?
    const REFERER = BIDDER_REQUEST?.refererInfo?.domain || window.location.host;
    const BIDDER_GDPR = BIDDER_REQUEST.gdprConsent && BIDDER_REQUEST.gdprConsent.gdprApplies ? 1 : null;
    const BIDDER_GDPRS = BIDDER_REQUEST.gdprConsent && BIDDER_REQUEST.gdprConsent.consentString ? BIDDER_REQUEST.gdprConsent.consentString : null;

    _each(validBidRequests, (bid) => {
      const DOMAIN = bid.params.pageurl || REFERER;
      const GDPR = BIDDER_GDPR || bid.params.gdpr || null;
      const GDPRS = BIDDER_GDPRS || bid.params.gdprs || null;
      const DNT = bid.params.dnt || null;
      const BID_FLOOR = bid.params.flrd > bid.params.flrmp ? bid.params.flrd : bid.params.flrmp;
      const VIDEO_BID = bid.video ? bid.video : {};

      const requestData = {
        id: generateUUID(),
        imp: [],
        site: {
          domain: DOMAIN
        },
        device: {
          ua: UA,
          geo: {
            utcoffset: UTC_OFFSET
          }
        },
        user: {
          ext: {}
        },
        test: 0,
        at: 2,
        tmax: bid.params.timeout || config.getConfig('bidderTimeout') || 100,
        cur: ['USD'],
        regs: {
          ext: {
            us_privacy: USP
          }
        }
      };

      if (isSet(DNT)) {
        requestData.device.dnt = DNT;
      }

      if (isSet(config.getConfig('coppa'))) {
        requestData.regs.coppa = config.getConfig('coppa') === true ? 1 : 0;
      }

      if (isSet(GDPR)) {
        requestData.regs.ext.gdpr = GDPR;
        requestData.regs.ext.gdprs = GDPRS;
      }

      if (isSet(bid.params.aid) || isSet(bid.params.appname) || isSet(bid.params.bundleid)) {
        requestData.app = {
          id: bid.params.aid,
          name: bid.params.appname,
          bundle: bid.params.bundleid
        };

        if (bid.params.contentId) {
          requestData.app.content = {
            id: bid.params.contentId,
            title: bid.params.contentTitle,
            len: bid.params.contentLength,
            url: bid.params.contentUrl
          };
        }
      }

      if (isSet(bid.params.idfa) || isSet(bid.params.aid)) {
        requestData.device.ifa = bid.params.idfa || bid.params.aid;
      }

      if (bid.schain) {
        requestData.source = {
          ext: {
            schain: bid.schain
          }
        };
      } else if (bid.params.schain) {
        const section = bid.params.schain.split('!');
        const verComplete = section[0].split(',');
        const node = section[1].split(',');

        requestData.source = {
          ext: {
            schain: {
              validation: 'strict',
              config: {
                ver: verComplete[0],
                complete: parseInt(verComplete[1]),
                nodes: [
                  {
                    asi: decodeURIComponent(node[0]),
                    sid: decodeURIComponent(node[1]),
                    hp: parseInt(node[2]),
                    rid: decodeURIComponent(node[3]),
                    name: decodeURIComponent(node[4]),
                    domain: decodeURIComponent(node[5])
                  }
                ]
              }
            }
          }
        };
      }

      _each(calculateSizes(VIDEO_BID, bid), (sizes) => {
        const impObj = {
          id: generateUUID(),
          displaymanager: bid.bidder,
          bidfloor: BID_FLOOR,
          video: {
            mimes: VIDEO_BID.mimes || MIMES_TYPES,
            protocols: VIDEO_BID.protocols || PROTOCOLS,
            nvol: bid.params.volume || PARAM_VOLUME_DEFAULT,
            w: sizes[0],
            h: sizes[1],
            skip: VIDEO_BID.skip || 0,
            playbackmethod: VIDEO_BID.playbackmethod || [1],
            placement: (bid.params.execution === 'outstream' || VIDEO_BID.context === 'outstream') ? 5 : 1,
            ext: {
              lkqdcustomparameters: {}
            },
          },
          bidfloorcur: 'USD',
          secure: 1
        };

        for (let k = 1; k <= 40; k++) {
          if (bid.params.hasOwnProperty(`c${k}`) && bid.params[`c${k}`]) {
            impObj.video.ext.lkqdcustomparameters[`c${k}`] = bid.params[`c${k}`];
          }
        }

        requestData.imp.push(impObj);
      });

      serverRequestObjects.push({
        method: 'POST',
        url: buildUrl({
          protocol: 'https',
          hostname: 'rtb.lkqd.net',
          pathname: '/ad',
          search: {
            pid: bid.params.publisherId || bid.params.placementId,
            sid: bid.params.siteId,
            output: 'rtb',
            prebid: true
          }
        }),
        data: requestData
      });
    });

    return serverRequestObjects;
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const serverBody = serverResponse.body;
    const bidResponses = [];

    if (serverBody && serverBody.seatbid) {
      _each(serverBody.seatbid, (seatbid) => {
        _each(seatbid.bid, (bid) => {
          if (bid.price > 0) {
            const bidResponse = {
              requestId: bidRequest.id,
              creativeId: bid.crid,
              cpm: bid.price,
              width: bid.w,
              height: bid.h,
              currency: serverBody.cur,
              netRevenue: true,
              ttl: BID_TTL_DEFAULT,
              ad: bid.adm,
              meta: {
                advertiserDomains: bid.adomain && Array.isArray(bid.adomain) ? bid.adomain : [],
                mediaType: VIDEO
              }
            };

            bidResponses.push(bidResponse);
          }
        });
      });
    } else {
      logError('Error: No server response or server response was empty for the requested URL');
    }

    return bidResponses;
  }
}

registerBidder(spec);
