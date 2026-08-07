import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO, NATIVE, AUDIO} from '../src/mediaTypes.js';

export const BIDDER_CODE = 'appnerve';
export const ENDPOINT = 'https://exchange.appnerve.net/openrtb2/auction';

function sourceId(bid: any): string {
  return String(bid?.params?.sourceId || bid?.params?.placementId || '').trim();
}

function firstSize(sizes: any): number[] | undefined {
  if (!Array.isArray(sizes)) return undefined;
  const size = Array.isArray(sizes[0]) ? sizes[0] : sizes;
  if (Number(size?.[0]) > 0 && Number(size?.[1]) > 0) return [Number(size[0]), Number(size[1])];
}

function bannerFormat(sizes: any): any[] {
  if (!Array.isArray(sizes)) return [];
  const rows = Array.isArray(sizes[0]) ? sizes : [sizes];
  return rows.filter((size: any) => Number(size?.[0]) > 0 && Number(size?.[1]) > 0)
    .map((size: any) => ({w: Number(size[0]), h: Number(size[1])}));
}

function requestedMediaTypes(bid: any): string[] {
  return [BANNER, VIDEO, NATIVE, AUDIO].filter((type) => bid?.mediaTypes?.[type]);
}

function floorMediaType(bid: any): string {
  return requestedMediaTypes(bid)[0] || BANNER;
}

function nativeRequest(native: any): any {
  const assets: any[] = [];
  let id = 1;
  if (native?.title) assets.push({id: id++, required: native.title.required ? 1 : 0, title: {len: Number(native.title.len || 90)}});
  if (native?.image) assets.push({id: id++, required: native.image.required ? 1 : 0, img: {type: 3, w: Number(native.image.sizes?.[0]), h: Number(native.image.sizes?.[1])}});
  if (native?.icon) assets.push({id: id++, required: native.icon.required ? 1 : 0, img: {type: 1, w: Number(native.icon.sizes?.[0]), h: Number(native.icon.sizes?.[1])}});
  if (native?.sponsoredBy) assets.push({id: id++, required: native.sponsoredBy.required ? 1 : 0, data: {type: 1, len: Number(native.sponsoredBy.len || 50)}});
  if (native?.body) assets.push({id: id++, required: native.body.required ? 1 : 0, data: {type: 2, len: Number(native.body.len || 140)}});
  if (native?.cta) assets.push({id: id++, required: native.cta.required ? 1 : 0, data: {type: 12, len: Number(native.cta.len || 30)}});
  return {ver: '1.2', context: 1, plcmttype: 1, assets, eventtrackers: [{event: 1, methods: [1, 2]}]};
}

function impression(bid: any): any {
  const imp: any = {
    id: bid.bidId,
    tagid: sourceId(bid),
    secure: 1,
    ext: {tid: bid.transactionId, prebid: {storedrequest: {id: sourceId(bid)}}}
  };
  if (bid.adUnitCode) imp.ext.adunitcode = bid.adUnitCode;
  if (bid.mediaTypes?.banner) {
    const format = bannerFormat(bid.mediaTypes.banner.sizes || bid.sizes);
    imp.banner = {format};
    const size = firstSize(format.map((row) => [row.w, row.h]));
    if (size) [imp.banner.w, imp.banner.h] = size;
  }
  if (bid.mediaTypes?.video) {
    const video = {...bid.mediaTypes.video};
    const size = firstSize(video.playerSize);
    if (size) {
      video.w = video.w || size[0];
      video.h = video.h || size[1];
    }
    delete video.playerSize;
    imp.video = video;
  }
  if (bid.mediaTypes?.native) imp.native = {request: JSON.stringify(nativeRequest(bid.mediaTypes.native)), ver: '1.2'};
  if (bid.mediaTypes?.audio) imp.audio = {...bid.mediaTypes.audio};
  if (typeof bid.getFloor === 'function') {
    const floor = bid.getFloor({currency: 'USD', mediaType: floorMediaType(bid), size: '*'});
    if (Number(floor?.floor) > 0) {
      imp.bidfloor = Number(floor.floor);
      imp.bidfloorcur = floor.currency || 'USD';
    }
  }
  return imp;
}

function applyPrivacy(request: any, bidderRequest: any): void {
  request.regs = {...(request.regs || {}), ext: {...(request.regs?.ext || {})}};
  request.user = {...(request.user || {}), ext: {...(request.user?.ext || {})}};
  if (bidderRequest?.gdprConsent) {
    request.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    if (bidderRequest.gdprConsent.consentString) request.user.ext.consent = bidderRequest.gdprConsent.consentString;
  }
  if (bidderRequest?.uspConsent) request.regs.ext.us_privacy = bidderRequest.uspConsent;
  if (bidderRequest?.gppConsent?.gppString) request.regs.ext.gpp = bidderRequest.gppConsent.gppString;
  if (Array.isArray(bidderRequest?.gppConsent?.applicableSections)) request.regs.ext.gpp_sid = bidderRequest.gppConsent.applicableSections;
}

function responseMediaType(bid: any, original: any): string {
  const declared = bid?.ext?.prebid?.type;
  if ([BANNER, VIDEO, NATIVE, AUDIO].includes(declared)) return declared;
  const adm = typeof bid?.adm === 'string' ? bid.adm.trim() : '';
  if (adm.startsWith('{') && /"native"\s*:/.test(adm)) return NATIVE;
  if (/<VAST[\s>]/i.test(adm)) {
    if (original?.mediaTypes?.audio && !original?.mediaTypes?.video) return AUDIO;
    return VIDEO;
  }
  return original?.mediaTypes?.banner ? BANNER : requestedMediaTypes(original)[0] || BANNER;
}

function nativeResponse(adm: any): any {
  let payload = adm;
  try { payload = typeof adm === 'string' ? JSON.parse(adm) : adm; } catch { return null; }
  const native = payload?.native || payload;
  if (!native || !Array.isArray(native.assets) || !native.link?.url) return null;
  const result: any = {
    clickUrl: native.link.url,
    clickTrackers: native.link.clicktrackers || [],
    impressionTrackers: native.imptrackers || [],
    javascriptTrackers: native.jstracker ? [native.jstracker] : []
  };
  native.assets.forEach((asset: any) => {
    if (asset.title?.text) result.title = asset.title.text;
    if (asset.img?.url && asset.img.type === 1) result.icon = {url: asset.img.url, width: asset.img.w, height: asset.img.h};
    if (asset.img?.url && asset.img.type !== 1) result.image = {url: asset.img.url, width: asset.img.w, height: asset.img.h};
    if (asset.data?.type === 1) result.sponsoredBy = asset.data.value;
    if (asset.data?.type === 2) result.body = asset.data.value;
    if (asset.data?.type === 12) result.cta = asset.data.value;
  });
  return result;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE, AUDIO],
  isBidRequestValid(bid: any): boolean {
    return Boolean(sourceId(bid) && bid?.bidId && requestedMediaTypes(bid).length);
  },
  buildRequests(validBidRequests: any[], bidderRequest: any): any[] {
    const grouped = validBidRequests.reduce((groups: Map<string, any[]>, bid: any) => {
      const id = sourceId(bid);
      groups.set(id, [...(groups.get(id) || []), bid]);
      return groups;
    }, new Map<string, any[]>());
    return [...grouped.entries()].map(([id, bids]) => {
      const ortb2 = bidderRequest?.ortb2 || {};
      const request: any = {
        ...ortb2,
        id: bidderRequest?.bidderRequestId || bidderRequest?.auctionId,
        imp: bids.map(impression),
        at: Number(ortb2.at || 1),
        tmax: bidderRequest?.timeout,
        cur: Array.isArray(ortb2.cur) && ortb2.cur.length ? ortb2.cur : ['USD'],
        source: {...(ortb2.source || {}), tid: ortb2.source?.tid || bidderRequest?.auctionId}
      };
      applyPrivacy(request, bidderRequest);
      return {
        method: 'POST',
        url: `${ENDPOINT}?ssp_id=${encodeURIComponent(id)}`,
        data: JSON.stringify(request),
        bidMap: Object.fromEntries(bids.map((bid: any) => [bid.bidId, bid])),
        options: {contentType: 'text/plain', withCredentials: false}
      };
    });
  },
  interpretResponse(serverResponse: any, request: any): any[] {
    let body = serverResponse?.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return []; }
    }
    if (!Array.isArray(body?.seatbid)) return [];
    const currency = String(body.cur || 'USD');
    return body.seatbid.flatMap((seat: any) => Array.isArray(seat?.bid) ? seat.bid : []).flatMap((bid: any) => {
      const original = request?.bidMap?.[bid?.impid];
      const price = Number(bid?.price);
      const creativeId = String(bid?.crid || bid?.id || '').trim();
      if (!original || !bid?.impid || !Number.isFinite(price) || price <= 0 || !creativeId || !bid?.adm) return [];
      const type = responseMediaType(bid, original);
      const response: any = {
        requestId: bid.impid, cpm: price, creativeId, currency,
        netRevenue: true, ttl: Number(bid.exp || 300), mediaType: type,
        dealId: bid.dealid, meta: {advertiserDomains: Array.isArray(bid.adomain) ? bid.adomain : []}
      };
      if (type === BANNER) {
        const fallback = firstSize(original.mediaTypes?.banner?.sizes || original.sizes);
        response.width = Number(bid.w || fallback?.[0]);
        response.height = Number(bid.h || fallback?.[1]);
        if (!response.width || !response.height) return [];
        response.ad = bid.adm;
      } else if (type === NATIVE) {
        response.native = nativeResponse(bid.adm);
        if (!response.native) return [];
      } else {
        response.vastXml = bid.adm;
      }
      return [response];
    });
  },
  getUserSyncs(): any[] {
    return [];
  }
};

registerBidder(spec);
