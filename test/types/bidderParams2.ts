import type { BidderParams } from '../../src/adUnits.ts';

export const thirtyThreeAcross: BidderParams['33across'] = { zoneId: 'sample33xGUID123456789', productId: 'siab' };
export const thirtyThreeAcrossMgni: BidderParams['33across_mgni'] = { siteId: 'sample33xGUID123456789', productId: 'inview', test: 1 };
export const thirtyThreeAcrossVideo: BidderParams['33across'] = { zoneId: 'sample33xGUID123456789', productId: 'instream', video: { mimes: ['video/mp4'], protocols: [2, 3], plcmt: 1, playerSize: [[640, 480]] } };
// @ts-expect-error - zoneId (or the legacy siteId) is required
export const thirtyThreeAcrossMissingZone: BidderParams['33across'] = { productId: 'siab' };
// @ts-expect-error - productId is 'siab', 'inview' or 'instream'
export const thirtyThreeAcrossBadProduct: BidderParams['33across'] = { zoneId: 'sample33xGUID123456789', productId: 'banner' };

export const sparteo: BidderParams['sparteo'] = { networkId: '1234567a-eb1b-1fae-1d23-e1fbaef234cf' };
export const sparteoCustom: BidderParams['sparteo'] = { networkId: '9061ab7e-f01e-43a5-b801-c1a56156f105', custom1: 'Test-datapoint_42', custom5: 'x' };
export const sparteoLegacy: BidderParams['sparteo'] = { publisherId: 'pub-1' };
// @ts-expect-error - networkId (or the legacy publisherId) is required
export const sparteoMissingNetwork: BidderParams['sparteo'] = { custom1: 'Test-datapoint_42' };

export const stackadapt: BidderParams['stackadapt'] = { publisherId: '123', testMode: 1 };
export const stackadaptFull: BidderParams['stackadapt'] = { publisherId: '4cd53a92ra91', placementId: 'e95365f397a7', banner: { expdir: [1, 3] }, bidfloor: 1.01 };
// @ts-expect-error - publisherId is required
export const stackadaptMissingPublisher: BidderParams['stackadapt'] = { placementId: 'e95365f397a7' };
// @ts-expect-error - banner.expdir is a list of numbers
export const stackadaptBadExpdir: BidderParams['stackadapt'] = { publisherId: '123', banner: { expdir: 'up' } };

export const insticator: BidderParams['insticator'] = { adUnitId: 'test' };
export const insticatorFull: BidderParams['insticator'] = {
  adUnitId: 'test',
  publisherId: 'test',
  user: { yob: 1982, gender: 'M', keywords: 'kw1,kw2', data: [{ name: 'p' }], ext: { custom: 'value' } },
  bid_endpoint_request_url: 'https://ex.ingage.com/v1/openrtb',
  floor: 0.5,
  bidfloorcur: 'USD',
  video: { minduration: 1, maxduration: 30, protocols: [2, 3] },
  audio: { mimes: ['audio/mp4'], feed: 3 }
};
// @ts-expect-error - adUnitId is required
export const insticatorMissingAdUnit: BidderParams['insticator'] = { publisherId: 'test' };
// @ts-expect-error - user.yob is a number
export const insticatorStringYob: BidderParams['insticator'] = { adUnitId: 'test', user: { yob: '1982' } };

export const colossusssp: BidderParams['colossusssp'] = { placement_id: 0 };
export const colossussspGroup: BidderParams['colossusssp'] = { group_id: '0' };
// @ts-expect-error - placement_id or group_id is required
export const colossussspMissingId: BidderParams['colossusssp'] = {};

export const taboola: BidderParams['taboola'] = { tagId: 'tester-placement', publisherId: 'tester-pub', bidfloor: 0.25, bcat: ['IAB1-1'], badv: ['example.com'] };
export const taboolaPosition: BidderParams['taboola'] = { tagId: 'Below The Article', publisherId: '1234567', pageType: 'homepage', position: 2 };
// @ts-expect-error - tagId is required
export const taboolaMissingTagId: BidderParams['taboola'] = { publisherId: 'tester-pub' };
// @ts-expect-error - badv is a list of domains
export const taboolaStringBadv: BidderParams['taboola'] = { tagId: 'tester-placement', publisherId: 'tester-pub', badv: 'example.com' };

export const justpremium: BidderParams['justpremium'] = { zone: 34364, allow: ['wp'] };
export const justpremiumExclude: BidderParams['justpremium'] = { zone: '34604', exclude: ['is'] };
// @ts-expect-error - zone is required
export const justpremiumMissingZone: BidderParams['justpremium'] = { allow: ['wp'] };
// @ts-expect-error - allow is a list of format codes
export const justpremiumStringAllow: BidderParams['justpremium'] = { zone: 34364, allow: 'wp' };

export const minutemedia: BidderParams['minutemedia'] = { org: '1234567890abcdef12345678', floorPrice: 2.00, placementId: 'video-test', testMode: false };
// @ts-expect-error - org is required
export const minutemediaMissingOrg: BidderParams['minutemedia'] = { placementId: 'banner-test' };
// @ts-expect-error - testMode is a boolean
export const minutemediaStringTestMode: BidderParams['minutemedia'] = { org: '1234567890abcdef12345678', testMode: 'false' };

export const outbrain: BidderParams['outbrain'] = {
  publisher: { id: '2706', name: 'Publishers Name', domain: 'publisher.com' },
  tagid: 'tag-id',
  bcat: ['IAB1-1'],
  badv: ['example.com']
};
// @ts-expect-error - publisher.id is required
export const outbrainMissingPublisherId: BidderParams['outbrain'] = { publisher: { name: 'Publishers Name' } };
// @ts-expect-error - publisher.id must be a string
export const outbrainNumericPublisherId: BidderParams['outbrain'] = { publisher: { id: 2706 } };

export const between: BidderParams['between'] = { s: 3649326 };
export const btw: BidderParams['btw'] = { s: 809832, cur: 'USD', pubdata: { section: 'news' } };
// @ts-expect-error - s is required
export const betweenMissingSection: BidderParams['between'] = { cur: 'USD' };

export const missena: BidderParams['missena'] = { apiKey: 'PA-34745704' };
export const msna: BidderParams['msna'] = { apiKey: 'PA-34745704', placement: 'sticky', settings: { settingName: 'value' } };
// @ts-expect-error - apiKey is required
export const missenaMissingApiKey: BidderParams['missena'] = { placement: 'sticky' };

export const inmobi: BidderParams['inmobi'] = { plc: '10000033152', bidfloor: 0.9 };
// @ts-expect-error - plc is required
export const inmobiMissingPlc: BidderParams['inmobi'] = { bidfloor: 0.9 };

export const optidigital: BidderParams['optidigital'] = {
  publisherId: 'test',
  placementId: 'Billboard_Top',
  divId: 'Billboard_Top_3c5425',
  pageTemplate: 'home',
  badv: ['example.com'],
  bcat: ['IAB1-1'],
  bapp: ['com.blocked'],
  battr: [1, 2]
};
// @ts-expect-error - publisherId is required
export const optidigitalMissingPublisher: BidderParams['optidigital'] = { placementId: 'Billboard_Top' };
// @ts-expect-error - battr values are numeric OpenRTB attributes
export const optidigitalStringBattr: BidderParams['optidigital'] = { publisherId: 'test', placementId: 'Billboard_Top', battr: ['1'] };

export const invibes: BidderParams['invibes'] = { placementId: '12345', domainId: 1001 };
// @ts-expect-error - placementId is required
export const invibesMissingPlacement: BidderParams['invibes'] = { domainId: 1001 };

export const connectad: BidderParams['connectad'] = { siteId: 123456, networkId: 123456, bidfloor: 0.20 };
export const connectadrealtime: BidderParams['connectadrealtime'] = { siteId: 123456, networkId: 123456 };
// @ts-expect-error - networkId is required
export const connectadMissingNetwork: BidderParams['connectad'] = { siteId: 123456 };

export const eplanning: BidderParams['eplanning'] = { ci: '18f66', sv: 'pbjs.e-planning.net', ml: 1, sn: 'adunitName' };
export const eplanningTest: BidderParams['eplanning'] = { t: 1 };
// @ts-expect-error - ci or t is required
export const eplanningMissingCi: BidderParams['eplanning'] = { sv: 'pbjs.e-planning.net' };
// @ts-expect-error - ci is a string
export const eplanningNumericCi: BidderParams['eplanning'] = { ci: 18 };

export const adtelligent: BidderParams['adtelligent'] = { aid: 331133 };
export const indicue: BidderParams['indicue'] = { aid: 12412, vpb_placement_id: 'top', iframe: true, outstream: { autoplay: true } };
// @ts-expect-error - aid is required
export const adtelligentMissingAid: BidderParams['adtelligent'] = { iframe: true };

export const themoneytizer: BidderParams['themoneytizer'] = { pid: -1, test: 1 };
export const themoneytizerBaseUrl: BidderParams['themoneytizer'] = { pid: 1234, baseUrl: 'https://custom-endpoint.biddertmz.com/m/' };
// @ts-expect-error - pid is required
export const themoneytizerMissingPid: BidderParams['themoneytizer'] = { test: 1 };

export const resetdigital: BidderParams['resetdigital'] = {
  pubId: 'your-pub-id',
  siteID: 'your-site-id',
  endpoint: 'https://ads.resetsrv.com',
  forceBid: true,
  zoneId: { placementId: '<id>', deals: '<deal ids>', test: 1 },
  inventory: { rating: ['5-star'] },
  keywords: ['travel', 'tourism'],
  latLong: [40.7608, 111.8910]
};
export const resetdigitalZoneOnly: BidderParams['resetdigital'] = { zoneId: { placementId: '<id>' } };
// @ts-expect-error - pubId or zoneId is required
export const resetdigitalMissingPubId: BidderParams['resetdigital'] = { siteID: 'your-site-id' };
// @ts-expect-error - inventory values are arrays of strings
export const resetdigitalBadInventory: BidderParams['resetdigital'] = { pubId: 'your-pub-id', inventory: { rating: '5-star' } };

export const nobid: BidderParams['nobid'] = { siteId: 2, placementId: 3 };
export const duration: BidderParams['duration'] = { siteId: 2, video: { skippable: true, playback_method: ['auto_play_sound_off'], mimes: ['video/mp4'], frameworks: [2] } };
// @ts-expect-error - siteId is required
export const nobidMissingSiteId: BidderParams['nobid'] = { placementId: 3 };
// @ts-expect-error - playback_method is a list of strings
export const nobidBadPlayback: BidderParams['nobid'] = { siteId: 2, video: { playback_method: 'click_to_play' } };
