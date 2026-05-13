/**
 * g1.network bid adapter for Prebid.js 9.x.
 * Endpoint: https://ssp-api.g1.network/ad-request (OpenRTB 2.6 over JSON).
 *
 * Bid params:
 *   propertyId : UUID v4 — registered property in g1-ssp
 *   adUnitId   : UUID v4 — ad-unit within the property
 *   endpoint   : optional override of ssp-api host
 */

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';

const BIDDER_CODE = 'g1network';
const DEFAULT_ENDPOINT = 'https://ssp-api.g1.network';
const DEFAULT_BID_TTL = 300;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(s) {
	return typeof s === 'string' && UUID_RE.test(s);
}

function buildPayload(bidRequest, bidderRequest) {
	const params = bidRequest.params || {};
	const refInfo = (bidderRequest && bidderRequest.refererInfo) || {};
	const payload = {
		property_id: params.propertyId,
		ad_unit_id: params.adUnitId,
		page_url: refInfo.page || refInfo.topmostLocation ||
			(typeof window !== 'undefined' ? window.location.href : '')
	};
	if (refInfo.ref) payload.page_ref = refInfo.ref;

	const gdpr = bidderRequest && bidderRequest.gdprConsent;
	if (gdpr && gdpr.consentString) payload.tc_string = gdpr.consentString;
	const gpp = bidderRequest && bidderRequest.gppConsent;
	if (gpp && gpp.gppString) payload.gpp_string = gpp.gppString;
	if (gpp && gpp.applicableSections) payload.gpp_sid = gpp.applicableSections;

	const uid2 = params.uid2Token ||
		(bidRequest.userIdAsEids || [])
			.find((eid) => eid.source === 'uidapi.com')?.uids?.[0]?.id;
	if (uid2) payload.uid2_token = uid2;
	if (params.deviceIdHash) payload.device_id_hash = params.deviceIdHash;

	const tmax = params.tmaxMs || (bidderRequest && bidderRequest.timeout);
	if (typeof tmax === 'number' && tmax > 0) {
		payload.tmax_ms = Math.min(2000, Math.max(50, Math.floor(tmax)));
	}
	return payload;
}

export const spec = {
	code: BIDDER_CODE,
	supportedMediaTypes: [BANNER, VIDEO, NATIVE],

	isBidRequestValid(bid) {
		const p = bid && bid.params;
		return !!p && isUuid(p.propertyId) && isUuid(p.adUnitId);
	},

	buildRequests(validBidRequests, bidderRequest) {
		return validBidRequests.map((bid) => {
			const endpoint = (bid.params && bid.params.endpoint) || DEFAULT_ENDPOINT;
			const payload = buildPayload(bid, bidderRequest);
			return {
				method: 'POST',
				url: `${endpoint}/ad-request`,
				data: JSON.stringify(payload),
				options: { contentType: 'application/json', withCredentials: false },
				// Stash the originating Prebid bidId so interpretResponse can map back.
				bidId: bid.bidId
			};
		});
	},

	interpretResponse(serverResponse, serverRequest) {
		const body = serverResponse && serverResponse.body;
		if (!body || !body.ok || !Array.isArray(body.bids) || body.bids.length === 0) {
			return [];
		}
		const cur = body.cur || 'USD';
		const bidId = serverRequest.bidId;
		return body.bids
			.filter((b) => typeof b.price === 'number' && b.price > 0)
			.map((b) => ({
				requestId: bidId,
				cpm: b.price,
				currency: cur,
				width: b.w,
				height: b.h,
				creativeId: b.crid || b.adid || bidId,
				dealId: b.dealid,
				netRevenue: true,
				ttl: DEFAULT_BID_TTL,
				ad: b.adm,
				adm: b.adm,
				mediaType: BANNER,
				meta: {
					advertiserDomains: b.adomain || [],
					networkId: BIDDER_CODE,
					primaryCatId: (b.cat && b.cat[0]) || undefined
				}
			}));
	},

	getUserSyncs() { return []; },
	onTimeout() {},
	onBidWon() {},
	onSetTargeting() {}
};

registerBidder(spec);
