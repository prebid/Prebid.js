import type { BidderParams } from '../../src/adUnits.ts';

export const teads: BidderParams['teads'] = { placementId: 12345, pageId: 1234 };
// @ts-expect-error - pageId is required
export const teadsMissingPageId: BidderParams['teads'] = { placementId: 12345 };

export const gumgum: BidderParams['gumgum'] = { zone: 'dc9d6be1', slot: '15901', bidfloor: 0.03 };
export const gumgumLegacy: BidderParams['gg'] = { inSlot: '15901', bidfloor: 0.03 };
// @ts-expect-error - a placement identifier (zone, pubId or a legacy one) is required
export const gumgumMissingZone: BidderParams['gumgum'] = { slot: '15901', bidfloor: 0.03 };
// @ts-expect-error - bidfloor must be a number
export const gumgumStringFloor: BidderParams['gumgum'] = { zone: 'dc9d6be1', bidfloor: '0.03' };

export const sovrn: BidderParams['sovrn'] = { tagid: '403370', bidfloor: 0.01 };
export const sovrnVideo: BidderParams['sovrn'] = { tagid: '315045', bidfloor: '0.04', video: { mimes: ['video/mp4'], protocols: [1, 2] } };
// @ts-expect-error - tagid is required
export const sovrnMissingTagid: BidderParams['sovrn'] = { bidfloor: 0.01 };

export const adagio: BidderParams['adagio'] = {
  placement: 'in_article',
  adUnitElementId: 'article_outstream',
  debug: { enabled: true, cpm: 3.00 },
  video: { api: [2], playbackMethod: [6], skip: 0 },
  native: { context: 1, plcmttype: 2 },
  splitKeyword: 'splitrule-one',
  dl: { placement: '1234' }
};
// @ts-expect-error - useAdUnitCodeAsPlacement is a boolean
export const adagioStringFlag: BidderParams['adagio'] = { useAdUnitCodeAsPlacement: 'true' };

export const amx: BidderParams['amx'] = { testMode: true, tagId: 'cHJlYmlkLm9yZw' };
// @ts-expect-error - tagId must be a string
export const amxNumericTagId: BidderParams['amx'] = { tagId: 123 };

export const rtbhouse: BidderParams['rtbhouse'] = { region: 'prebid-eu', publisherId: 'PREBID_TEST_ID', bidfloor: 0.01 };
// @ts-expect-error - region must be one of the RTB House regions
export const rtbhouseBadRegion: BidderParams['rtbhouse'] = { region: 'eu', publisherId: 'PREBID_TEST_ID' };

export const medianet: BidderParams['medianet'] = { cid: '8CUX0H51C', crid: '776755783', site: { page: 'http://smoketesting.net/prebidtest/', domain: 'smoketesting.net', ref: 'http://smoketesting.net/prebidtest/' } };
export const trustedstack: BidderParams['trustedstack'] = { cid: '8CUX0H51C', crid: 451466393 };
// @ts-expect-error - cid must be a string
export const medianetNumericCid: BidderParams['medianet'] = { cid: 8, crid: '451466393' };

export const onetag: BidderParams['onetag'] = { pubId: '386276e072' };
// @ts-expect-error - pubId is required
export const onetagMissingPubId: BidderParams['onetag'] = { ext: { customKey: 'customValue' } };

export const smartadserver: BidderParams['smartadserver'] = { domain: 'https://prg.smartadserver.com', siteId: 326147, pageId: 1153895, formatId: 55710, bidfloor: 5, video: { protocol: 6, startDelay: 1 } };
export const smart: BidderParams['smart'] = { siteId: 207435, pageId: 896536, formatId: 62913, ckId: 1122334455 };
// @ts-expect-error - formatId is required
export const smartadserverMissingFormat: BidderParams['smartadserver'] = { siteId: 207435, pageId: 896536 };

export const seedtag: BidderParams['seedtag'] = { publisherId: '0000-0000-01', adUnitId: '0000', placement: 'inScreen' };
export const st: BidderParams['st'] = { publisherId: '0000-0000-01', integrationType: 'ronId' };
// @ts-expect-error - integrationType is 'publisherToken' or 'ronId'
export const seedtagBadIntegration: BidderParams['seedtag'] = { publisherId: '0000-0000-01', integrationType: 'other' };

export const grid: BidderParams['grid'] = {
  uid: 2,
  keywords: {
    site: {
      publisher: [{
        name: 'someKeywordsName',
        brandsafety: ['disaster'],
        topic: ['stress', 'fear']
      }]
    }
  }
};
export const gridSecid: BidderParams['gridNM'] = { secid: '1', bidFloor: 0.5 };
// params.video.playerSize overrides mediaTypes.video.playerSize (createVideoRequest)
export const gridPlayerSize: BidderParams['grid'] = { uid: 11, video: { playerSize: [[640, 480]] } };
export const gridSinglePlayerSize: BidderParams['grid'] = { uid: 11, video: { playerSize: [640, 480] } };
// @ts-expect-error - playerSize is [width, height] numbers
export const gridBadPlayerSize: BidderParams['grid'] = { uid: 11, video: { playerSize: '640x480' } };
// @ts-expect-error - uid or secid is required
export const gridMissingUid: BidderParams['grid'] = { bidFloor: 0.5 };

export const richaudience: BidderParams['richaudience'] = {
  pid: 'ADb1f40rmo',
  bidfloor: 0.40,
  keywords: 'key1=value1;key2=value2;key3=value3;'
};
// @ts-expect-error - pid is required
export const richaudienceMissingPid: BidderParams['ra'] = { bidfloor: 0.4 };

export const smilewanted: BidderParams['smilewanted'] = { zoneId: 1 };
// @ts-expect-error - zoneId is required
export const smilewantedMissingZone: BidderParams['sw'] = { bidfloor: 1 };

export const nativo: BidderParams['nativo'] = {
  url: 'https://test-sites.internal.nativo.net/testing/prebid_adpater.html'
};
// @ts-expect-error - url is a string
export const nativoNumericUrl: BidderParams['ntv'] = { url: 42 };

export const ogury: BidderParams['ogury'] = {
  assetKey: 'OGY-CA41D116484F',
  adUnitId: '2c4d61d0-90aa-0139-0cda-0242ac120004'
};
// @ts-expect-error - gravity must be one of the documented positions
export const oguryBadGravity: BidderParams['ogury'] = { assetKey: 'OGY-CA41D116484F', adUnitId: 'x', gravity: 'LEFT' };

export const improvedigital: BidderParams['improvedigital'] = { publisherId: 950, placementId: 22137694, keyValues: { testKey: ['testValue'] } };
// @ts-expect-error - publisherId is required
export const improvedigitalMissingPublisher: BidderParams['improvedigital'] = { placementId: 22135702 };

export const rise: BidderParams['rise'] = { org: '1234567890abcdef12345678', floorPrice: 2.00, placementId: '12345678', testMode: false, rtbDomain: 'www.test.com' };
// @ts-expect-error - org is required
export const riseMissingOrg: BidderParams['openwebxchange'] = { placementId: '12345678' };

export const yahooAdsDcnPos: BidderParams['yahooAds'] = { dcn: '8a969516017a7a396ec539d97f540011', pos: '8a969978017a7aaabab4ab0bc01a0009' };
export const yahooAdsPubId: BidderParams['yahooAdvertising'] = { pubId: 'DemoPublisher', siteId: '1234567' };
export const yahooAdsE2e: BidderParams['yahoossp'] = { testing: { e2etest: true } };
// @ts-expect-error - dcn needs pos
export const yahooAdsMissingPos: BidderParams['yahooAds'] = { dcn: '8a969516017a7a396ec539d97f540011' };

export const adyoulike: BidderParams['adyoulike'] = { placement: 'e622af275681965d3095808561a1e510' };
// @ts-expect-error - placement is a string
export const adyoulikeNumericPlacement: BidderParams['ayl'] = { placement: 194 };

export const sonobi: BidderParams['sonobi'] = { ad_unit: '/7780971/sparks_prebid_MR', placement_id: '1a2b3c4d5e6f1a2b3c4d', sizes: [[300, 250], [300, 600]], floor: 1 };
// @ts-expect-error - ad_unit or placement_id is required
export const sonobiMissingSlot: BidderParams['sonobi'] = { floor: 1 };
