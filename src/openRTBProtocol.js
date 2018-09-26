// jshint esversion: 6, es3: false, node: true
import adaptermanager from './adaptermanager';
import * as utils from './utils';

export function buildRequestOpenRTB(s2sBidRequest, bidRequests, adUnits, protocolHelpers) {
  let imps = [];
  let aliases = {};

  // transform ad unit into array of OpenRTB impression objects
  adUnits.forEach(adUnit => {
    adUnit.bids.forEach(bid => {
      // OpenRTB response contains the adunit code and bidder name. These are
      // combined to create a unique key for each bid since an id isn't returned
      const key = `${adUnit.code}${bid.bidder}`;
      this.bidMap[key] = bid;

      // check for and store valid aliases to add to the request
      if (adaptermanager.aliasRegistry[bid.bidder]) {
        aliases[bid.bidder] = adaptermanager.aliasRegistry[bid.bidder];
      }
    });

    let banner;
    // default to banner if mediaTypes isn't defined
    if (utils.isEmpty(adUnit.mediaTypes)) {
      const sizeObjects = adUnit.sizes.map(size => ({ w: size[0], h: size[1] }));
      banner = {format: sizeObjects};
    }

    const bannerParams = utils.deepAccess(adUnit, 'mediaTypes.banner');
    if (bannerParams && bannerParams.sizes) {
      const sizes = utils.parseSizesInput(bannerParams.sizes);

      // get banner sizes in form [{ w: <int>, h: <int> }, ...]
      const format = sizes.map(size => {
        const [ width, height ] = size.split('x');
        const w = parseInt(width, 10);
        const h = parseInt(height, 10);
        return { w, h };
      });

      banner = {format};
    }

    let video;
    const videoParams = utils.deepAccess(adUnit, 'mediaTypes.video');
    if (!utils.isEmpty(videoParams)) {
      video = videoParams;
    }

    const ext = adUnit.bids.reduce((acc, bid) => {
      const adapter = adaptermanager.bidderRegistry[bid.bidder];
      if (adapter && adapter.getSpec().transformBidParams) {
        bid.params = adapter.getSpec().transformBidParams(bid.params, protocolHelpers.isOpenRtb());
      }
      acc[bid.bidder] = bid.params;
      return acc;
    }, {});

    const imp = { id: adUnit.code, ext, secure: protocolHelpers._s2sConfig.secure };

    if (banner) { imp.banner = banner; }
    if (video) { imp.video = video; }

    imps.push(imp);
  });

  const request = {
    id: s2sBidRequest.tid,
    source: {tid: s2sBidRequest.tid},
    tmax: protocolHelpers._s2sConfig.timeout,
    imp: imps,
    test: protocolHelpers.getConfig('debug') ? 1 : 0
  };

  protocolHelpers._appendSiteAppDevice(request);

  const digiTrust = protocolHelpers._getDigiTrustQueryParams();
  if (digiTrust) {
    request.user = { ext: { digitrust: digiTrust } };
  }

  if (!utils.isEmpty(aliases)) {
    request.ext = { prebid: { aliases } };
  }

  if (bidRequests && bidRequests[0].gdprConsent) {
    // note - gdprApplies & consentString may be undefined in certain use-cases for consentManagement module
    let gdprApplies;
    if (typeof bidRequests[0].gdprConsent.gdprApplies === 'boolean') {
      gdprApplies = bidRequests[0].gdprConsent.gdprApplies ? 1 : 0;
    }

    if (request.regs) {
      if (request.regs.ext) {
        request.regs.ext.gdpr = gdprApplies;
      } else {
        request.regs.ext = { gdpr: gdprApplies };
      }
    } else {
      request.regs = { ext: { gdpr: gdprApplies } };
    }

    let consentString = bidRequests[0].gdprConsent.consentString;
    if (request.user) {
      if (request.user.ext) {
        request.user.ext.consent = consentString;
      } else {
        request.user.ext = { consent: consentString };
      }
    } else {
      request.user = { ext: { consent: consentString } };
    }
  }

  return request;
}
