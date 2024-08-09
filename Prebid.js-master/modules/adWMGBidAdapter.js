'use strict';

import { tryAppendQueryString } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'adWMG';
const ENDPOINT = 'https://hb.adwmg.com/hb';
let SYNC_ENDPOINT = 'https://hb.adwmg.com/cphb.html?';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['wmg'],
  supportedMediaTypes: [BANNER],
  isBidRequestValid: (bid) => {
    if (bid.bidder !== BIDDER_CODE) {
      return false;
    }

    if (!(bid.params.publisherId)) {
      return false;
    }

    return true;
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    const timeout = bidderRequest.timeout || 0;
    const debug = config.getConfig('debug') || false;
    const referrer = bidderRequest.refererInfo.referer;
    const locale = window.navigator.language && window.navigator.language.length > 0 ? window.navigator.language.substr(0, 2) : '';
    const domain = config.getConfig('publisherDomain') || (window.location && window.location.host ? window.location.host : '');
    const ua = window.navigator.userAgent.toLowerCase();
    const additional = spec.parseUserAgent(ua);

    return validBidRequests.map(bidRequest => {
      const checkFloorValue = (value) => {
        if (isNaN(parseFloat(value))) {
          return 0;
        } else return parseFloat(value);
      }

      const adUnit = {
        code: bidRequest.adUnitCode,
        bids: {
          bidder: bidRequest.bidder,
          params: {
            publisherId: bidRequest.params.publisherId,
            IABCategories: bidRequest.params.IABCategories || [],
            floorCPM: bidRequest.params.floorCPM ? checkFloorValue(bidRequest.params.floorCPM) : 0
          }
        },
        mediaTypes: bidRequest.mediaTypes
      };

      if (bidRequest.hasOwnProperty('sizes') && bidRequest.sizes.length > 0) {
        adUnit.sizes = bidRequest.sizes;
      }

      const request = {
        auctionId: bidRequest.auctionId,
        requestId: bidRequest.bidId,
        bidRequestsCount: bidRequest.bidRequestsCount,
        bidderRequestId: bidRequest.bidderRequestId,
        transactionId: bidRequest.transactionId,
        referrer: referrer,
        timeout: timeout,
        adUnit: adUnit,
        locale: locale,
        domain: domain,
        os: additional.os,
        osv: additional.osv,
        devicetype: additional.devicetype
      };

      if (bidderRequest.gdprConsent) {
        request.gdpr = {
          applies: bidderRequest.gdprConsent.gdprApplies,
          consentString: bidderRequest.gdprConsent.consentString
        };
      }

      /*       if (bidderRequest.uspConsent) {
        request.uspConsent = bidderRequest.uspConsent;
      }
 */
      if (bidRequest.userId && bidRequest.userId.pubcid) {
        request.userId = {
          pubcid: bidRequest.userId.pubcid
        };
      }

      if (debug) {
        request.debug = debug;
      }

      return {
        method: 'POST',
        url: ENDPOINT,
        data: JSON.stringify(request)
      }
    });
  },
  interpretResponse: (serverResponse) => {
    const bidResponses = [];

    if (serverResponse.body) {
      const response = serverResponse.body;
      const bidResponse = {
        requestId: response.requestId,
        cpm: response.cpm,
        width: response.width,
        height: response.height,
        creativeId: response.creativeId,
        currency: response.currency,
        netRevenue: response.netRevenue,
        ttl: response.ttl,
        ad: response.ad,
        meta: {
          advertiserDomains: response.adomain && response.adomain.length ? response.adomain : [],
          mediaType: 'banner'
        }
      };
      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    if (gdprConsent && SYNC_ENDPOINT.indexOf('gdpr') === -1) {
      SYNC_ENDPOINT = tryAppendQueryString(SYNC_ENDPOINT, 'gdpr', (gdprConsent.gdprApplies ? 1 : 0));
    }

    if (gdprConsent && typeof gdprConsent.consentString === 'string' && SYNC_ENDPOINT.indexOf('gdpr_consent') === -1) {
      SYNC_ENDPOINT = tryAppendQueryString(SYNC_ENDPOINT, 'gdpr_consent', gdprConsent.consentString);
    }

    if (SYNC_ENDPOINT.slice(-1) === '&') {
      SYNC_ENDPOINT = SYNC_ENDPOINT.slice(0, -1);
    }

    /*     if (uspConsent) {
      SYNC_ENDPOINT = tryAppendQueryString(SYNC_ENDPOINT, 'us_privacy', uspConsent);
    } */
    let syncs = [];
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: SYNC_ENDPOINT
      });
    }
    return syncs;
  },
  parseUserAgent: (ua) => {
    function detectDevice() {
      if (/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i
        .test(ua.toLowerCase())) {
        return 5;
      }
      if (/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i
        .test(ua.toLowerCase())) {
        return 4;
      }
      if (/smart[-_\s]?tv|hbbtv|appletv|googletv|hdmi|netcast|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b/i
        .test(ua.toLowerCase())) {
        return 3;
      }
      return 2;
    }

    function detectOs() {
      const module = {
        options: [],
        header: [navigator.platform, ua, navigator.appVersion, navigator.vendor, window.opera],
        dataos: [{
          name: 'Windows Phone',
          value: 'Windows Phone',
          version: 'OS'
        },
        {
          name: 'Windows',
          value: 'Win',
          version: 'NT'
        },
        {
          name: 'iOS',
          value: 'iPhone',
          version: 'OS'
        },
        {
          name: 'iOS',
          value: 'iPad',
          version: 'OS'
        },
        {
          name: 'Kindle',
          value: 'Silk',
          version: 'Silk'
        },
        {
          name: 'Android',
          value: 'Android',
          version: 'Android'
        },
        {
          name: 'PlayBook',
          value: 'PlayBook',
          version: 'OS'
        },
        {
          name: 'BlackBerry',
          value: 'BlackBerry',
          version: '/'
        },
        {
          name: 'Macintosh',
          value: 'Mac',
          version: 'OS X'
        },
        {
          name: 'Linux',
          value: 'Linux',
          version: 'rv'
        },
        {
          name: 'Palm',
          value: 'Palm',
          version: 'PalmOS'
        }
        ],
        init: function () {
          var agent = this.header.join(' ');
          var os = this.matchItem(agent, this.dataos);
          return {
            os
          };
        },

        getVersion: function (name, version) {
          if (name === 'Windows') {
            switch (parseFloat(version).toFixed(1)) {
              case '5.0':
                return '2000';
              case '5.1':
                return 'XP';
              case '5.2':
                return 'Server 2003';
              case '6.0':
                return 'Vista';
              case '6.1':
                return '7';
              case '6.2':
                return '8';
              case '6.3':
                return '8.1';
              default:
                return version || 'other';
            }
          } else return version || 'other';
        },

        matchItem: function (string, data) {
          var i = 0;
          var j = 0;
          var regex, regexv, match, matches, version;

          for (i = 0; i < data.length; i += 1) {
            regex = new RegExp(data[i].value, 'i');
            match = regex.test(string);
            if (match) {
              regexv = new RegExp(data[i].version + '[- /:;]([\\d._]+)', 'i');
              matches = string.match(regexv);
              version = '';
              if (matches) {
                if (matches[1]) {
                  matches = matches[1];
                }
              }
              if (matches) {
                matches = matches.split(/[._]+/);
                for (j = 0; j < matches.length; j += 1) {
                  if (j === 0) {
                    version += matches[j] + '.';
                  } else {
                    version += matches[j];
                  }
                }
              } else {
                version = 'other';
              }
              return {
                name: data[i].name,
                version: this.getVersion(data[i].name, version)
              };
            }
          }
          return {
            name: 'unknown',
            version: 'other'
          };
        }
      };

      var e = module.init();

      return {
        os: e.os.name || '',
        osv: e.os.version || ''
      }
    }

    return {
      devicetype: detectDevice(),
      os: detectOs().os,
      osv: detectOs().osv
    }
  }
};
registerBidder(spec);
