/**
 * Unit tests for billow_rtb25 bid adapter (OpenRTB 2.5 via ortbConverter).
 *
 * 中文：必须保证 interpretResponse 所用的 request.data 与本次 buildRequests 返回的 data 是同一对象引用。
 *
 * CRITICAL — same object reference:
 * `ortbConverter.fromORTB` stores per-auction context in a WeakMap keyed by the
 * request object returned from `toORTB`. If tests pass a clone to `interpretResponse`,
 * you get: "ortbRequest passed to `fromORTB` must be the same object returned by `toORTB`".
 * Always use the `data` property from the return value of `spec.buildRequests`.
 */

import {expect} from 'chai';
import {spec} from 'modules/billow_rtb25BidAdapter.js';
import {BANNER, VIDEO, NATIVE, AUDIO} from 'src/mediaTypes.ts';

const DEFAULT_ENDPOINT = 'https://adx-sg.billowlink.com/api/rtb/adsWeb';

/** Minimal OpenRTB native request (assets required for imp.native). */
const SAMPLE_NATIVE_ORTB_REQUEST = {
    assets: [{id: 1, required: 1, title: {len: 80}}],
};

function makeBidderRequest(ortb2 = {}, overrides = {}) {
    return Object.assign({
        auctionId: 'auction-1', bidderRequestId: 'br-1', refererInfo: {page: 'https://example.test/page'}, ortb2,
    }, overrides);
}

/** Banner imp: ortbConverter fills imp.banner from mediaTypes.banner.sizes */
function makeBannerBid(overrides = {}) {
    return Object.assign({
        bidId: overrides.bidId || 'bid-banner-1',
        adUnitCode: 'div-gpt-test',
        bidder: 'billow_rtb25',
        params: {placementId: overrides.placementId || 'plc-banner-1'},
        mediaTypes: {
            banner: {sizes: [[300, 250]]},
        },
    }, overrides);
}

function makeVideoBid(overrides = {}) {
    return Object.assign({
        bidId: overrides.bidId || 'bid-video-1',
        adUnitCode: 'div-video',
        bidder: 'billow_rtb25',
        params: {placementId: overrides.placementId || 'plc-video-1'},
        mediaTypes: {
            video: {
                context: 'outstream', playerSize: [640, 480],
            },
        },
    }, overrides);
}

function makeNativeBid(overrides = {}) {
    return Object.assign({
        bidId: overrides.bidId || 'bid-native-1',
        adUnitCode: 'div-native',
        bidder: 'billow_rtb25',
        params: {placementId: overrides.placementId || 'plc-native-1'},
        mediaTypes: {
            native: {
                ortb: SAMPLE_NATIVE_ORTB_REQUEST,
            },
        },
        nativeOrtbRequest: SAMPLE_NATIVE_ORTB_REQUEST,
    }, overrides);
}

function makeAudioBid(overrides = {}) {
    return Object.assign({
        bidId: overrides.bidId || 'bid-audio-1',
        adUnitCode: 'div-audio',
        bidder: 'billow_rtb25',
        params: {placementId: overrides.placementId || 'plc-audio-1'},
        mediaTypes: {
            audio: {
                mimes: ['audio/mp4'],
            },
        },
    }, overrides);
}

/**
 * Build ORTB request then parse bid response using the SAME data reference (WeakMap contract).
 */
function buildRequestThenInterpret(validBidRequests, bidderRequest, body) {
    const built = spec.buildRequests(validBidRequests, bidderRequest);
    return spec.interpretResponse({body}, {data: built.data});
}

function openrtbBid(impid, adm, extra = {}) {
    return Object.assign({
        id: 'seat-bid-id-' + impid, impid, price: 1.5, adm, adomain: ['example.test'],
    }, extra);
}

describe('billow_rtb25BidAdapter', function () {
    describe('adapter metadata', function () {
        it('should expose expected code, media types, and capacity flag', function () {
            expect(spec.code).to.equal('billow_rtb25');
            expect(spec.supportedMediaTypes).to.include.members([BANNER, VIDEO, NATIVE, AUDIO]);
            expect(spec.alwaysHasCapacity).to.equal(true);
        });
    });

    describe('isBidRequestValid', function () {
        it('should return true when params.placementId is a non-empty string', function () {
            expect(spec.isBidRequestValid(makeBannerBid({params: {placementId: 'abc'}}))).to.equal(true);
        });

        it('should return true when params.placementId is numeric (truthy)', function () {
            expect(spec.isBidRequestValid(makeBannerBid({params: {placementId: 12345}}))).to.equal(true);
        });

        it('should return false when placementId is missing', function () {
            expect(spec.isBidRequestValid(makeBannerBid({params: {}}))).to.equal(false);
        });

        it('should return false when placementId is empty string', function () {
            expect(spec.isBidRequestValid(makeBannerBid({params: {placementId: ''}}))).to.equal(false);
        });
    });

    describe('buildRequests', function () {
        it('should POST JSON to default endpoint with application/json content type', function () {
            const bidderRequest = makeBidderRequest();
            const out = spec.buildRequests([makeBannerBid()], bidderRequest);

            expect(out.method).to.equal('POST');
            expect(out.url).to.equal(DEFAULT_ENDPOINT);
            expect(out.options).to.deep.equal({contentType: 'application/json'});
            expect(out.data).to.be.an('object');
            expect(out.data.imp).to.be.an('array').with.lengthOf(1);
        });

        it('should use params.endpoint from the first bid when provided', function () {
            const customUrl = 'http://127.0.0.1:8604/api/rtb/adsWeb';
            const bid = makeBannerBid({
                params: {placementId: 'p1', endpoint: customUrl},
            });
            const out = spec.buildRequests([bid], makeBidderRequest());
            expect(out.url).to.equal(customUrl);
        });

        it('should set imp.tagid from placementId and imp.id from bidId', function () {
            const bid = makeBannerBid({
                bidId: 'prebid-bid-xyz', params: {placementId: 'tag-from-plc'},
            });
            const out = spec.buildRequests([bid], makeBidderRequest());
            const imp = out.data.imp[0];
            expect(imp.tagid).to.equal('tag-from-plc');
            expect(imp.id).to.equal('prebid-bid-xyz');
        });

        it('should coerce numeric placementId to string on imp.tagid', function () {
            const bid = makeBannerBid({params: {placementId: 999}});
            const out = spec.buildRequests([bid], makeBidderRequest());
            expect(out.data.imp[0].tagid).to.equal('999');
        });

        it('should set request tmax from bidderRequest.timeout', function () {
            const out = spec.buildRequests([makeBannerBid()], makeBidderRequest({}, {timeout: 750}));
            expect(out.data.tmax).to.equal(750);
        });

        it('should emit one imp per bid (multi-slot)', function () {
            const bids = [makeBannerBid({bidId: 'b1', params: {placementId: 'slot-a'}}), makeBannerBid({
                bidId: 'b2', params: {placementId: 'slot-b'}
            }),];
            const out = spec.buildRequests(bids, makeBidderRequest());
            expect(out.data.imp).to.have.lengthOf(2);
            expect(out.data.imp[0].id).to.equal('b1');
            expect(out.data.imp[0].tagid).to.equal('slot-a');
            expect(out.data.imp[1].id).to.equal('b2');
            expect(out.data.imp[1].tagid).to.equal('slot-b');
        });

        /**
         * 适配器未单独实现 GDPR/CCPA/COPPA；仅验证 ortb2 经 mergeDeep 进入请求体（与 consentManagement 等模块配合时的回归保护）。
         */
        it('should merge bidderRequest.ortb2 privacy and regs fields into the ORTB payload', function () {
            const ortb2 = {
                regs: {
                    coppa: 1, ext: {
                        gdpr: 1, us_privacy: '1YNN',
                    },
                }, user: {
                    ext: {
                        consent: 'CONSENTSTRING',
                    },
                },
            };
            const out = spec.buildRequests([makeBannerBid()], makeBidderRequest(ortb2));
            expect(out.data.regs.coppa).to.equal(1);
            expect(out.data.regs.ext.gdpr).to.equal(1);
            expect(out.data.regs.ext.us_privacy).to.equal('1YNN');
            expect(out.data.user.ext.consent).to.equal('CONSENTSTRING');
        });
    });

    describe('interpretResponse', function () {
        it('should return [] when body is missing or null', function () {
            expect(spec.interpretResponse(null, {data: {}})).to.deep.equal([]);
            expect(spec.interpretResponse({}, {data: {}})).to.deep.equal([]);
            expect(spec.interpretResponse({body: null}, {data: {}})).to.deep.equal([]);
        });

        it('should return [] when seatbid is missing, empty, or not an array', function () {
            expect(spec.interpretResponse({body: {id: 'r1'}}, {data: {}})).to.deep.equal([]);
            expect(spec.interpretResponse({body: {id: 'r1', seatbid: []}}, {data: {}})).to.deep.equal([]);
            expect(spec.interpretResponse({body: {id: 'r1', seatbid: {}}}, {data: {}})).to.deep.equal([]);
        });

        it('should map a banner OpenRTB bid to Prebid banner fields', function () {
            const bid = makeBannerBid({bidId: 'imp-match-1'});
            const bidderRequest = makeBidderRequest();
            const body = {
                id: 'resp-1', cur: 'USD', seatbid: [{
                    bid: [openrtbBid('imp-match-1', '<div id="creative">billow</div>'),],
                },],
            };

            const result = buildRequestThenInterpret([bid], bidderRequest, body);
            expect(result).to.have.lengthOf(1);
            const b = result[0];
            expect(b.requestId).to.equal('imp-match-1');
            expect(b.mediaType).to.equal('banner');
            expect(b.ad).to.include('billow');
            expect(b.cpm).to.equal(1.5);
            expect(b.currency).to.equal('USD');
            expect(b.netRevenue).to.equal(true);
            expect(b.ttl).to.equal(30);
            expect(b.meta.advertiserDomains).to.deep.equal(['example.test']);
        });

        it('should replace ${AUCTION_PRICE} and ${AUCTION_LOSS} in banner ad markup', function () {
            const adm = '<div><img src="https://track.example/imp?p=${AUCTION_PRICE}&loss=${AUCTION_LOSS}"></div>';
            const bid = makeBannerBid({bidId: 'imp-macros'});
            const body = {
                id: 'resp-m', cur: 'USD', seatbid: [{bid: [openrtbBid('imp-macros', adm)]}],
            };
            const result = buildRequestThenInterpret([bid], makeBidderRequest(), body);
            expect(result[0].ad).to.include('p=1.5');
            expect(result[0].ad).to.include('loss=0');
            expect(result[0].ad).not.to.include('${AUCTION_PRICE}');
            expect(result[0].ad).not.to.include('${AUCTION_LOSS}');
        });

        it('should replace all supported ${AUCTION_*} macros in banner ad markup', function () {
            const bid = makeBannerBid({bidId: 'imp-all-macros'});
            const bidderRequest = makeBidderRequest();
            const built = spec.buildRequests([bid], bidderRequest);
            const auctionReqId = built.data.id;
            const ortbBidId = 'openrtb-bid-seat-1';
            const adm = '<div>https://track.example/imp?req=${AUCTION_ID}&bid=${AUCTION_BID_ID}&imp=${AUCTION_IMP_ID}' + '&seat=${AUCTION_SEAT_ID}&adid=${AUCTION_AD_ID}&p=${AUCTION_PRICE}&cur=${AUCTION_CURRENCY}' + '&mbr=${AUCTION_MBR}&loss=${AUCTION_LOSS}</div>';
            const body = {
                id: 'resp-all-macros', // Wrong cur on wire: adapter still exposes USD for bid + macros.
                cur: 'JPY', seatbid: [{
                    seat: 'seat-42', bid: [openrtbBid('imp-all-macros', adm, {id: ortbBidId, adid: 'backend-adid-99'})],
                },],
            };
            const result = spec.interpretResponse({body}, {data: built.data});
            expect(result).to.have.lengthOf(1);
            const outAd = result[0].ad;
            expect(outAd).to.include('req=' + auctionReqId);
            expect(outAd).to.include('bid=' + ortbBidId);
            expect(outAd).to.include('imp=imp-all-macros');
            expect(outAd).to.include('seat=seat-42');
            expect(outAd).to.include('adid=backend-adid-99');
            expect(outAd).to.include('p=1.5');
            expect(outAd).to.include('cur=USD');
            expect(result[0].currency).to.equal('USD');
            expect(outAd).to.include('mbr=&loss=0');
            expect(outAd).not.to.match(/\$\{AUCTION_/);
        });

        // gulp test 会先跑 test-all-features-disabled；此时无 video imp，adapter 会把 mediaType 判成 banner。
        if (FEATURES.VIDEO) {
            it('should map a video OpenRTB bid adm to vastXml', function () {
                const bid = makeVideoBid({bidId: 'v-imp-1'});
                const vast = '<?xml version="1.0"?><VAST version="3.0"><Ad></Ad></VAST>';
                const body = {
                    id: 'resp-v', cur: 'USD', seatbid: [{bid: [openrtbBid('v-imp-1', vast)]}],
                };

                const result = buildRequestThenInterpret([bid], makeBidderRequest(), body);
                expect(result).to.have.lengthOf(1);
                expect(result[0].mediaType).to.equal('video');
                expect(result[0].vastXml).to.equal(vast);
                expect(result[0].requestId).to.equal('v-imp-1');
            });

            it('should replace auction macros inside vastXml', function () {
                const vast = '<?xml version="1.0"?><VAST version="3.0"><Ad><InLine>' + '<Impression><![CDATA[https://track.example/imp?p=${AUCTION_PRICE}&loss=${AUCTION_LOSS}]]></Impression>' + '</InLine></Ad></VAST>';
                const bid = makeVideoBid({bidId: 'v-macro-1'});
                const body = {
                    id: 'resp-vm', cur: 'USD', seatbid: [{bid: [openrtbBid('v-macro-1', vast)]}],
                };
                const result = buildRequestThenInterpret([bid], makeBidderRequest(), body);
                expect(result[0].vastXml).to.include('p=1.5');
                expect(result[0].vastXml).to.include('loss=0');
                expect(result[0].vastXml).not.to.include('${AUCTION_PRICE}');
            });
        }

        if (FEATURES.NATIVE) {
            it('should map a native OpenRTB bid adm JSON to native.ortb', function () {
                const bid = makeNativeBid({bidId: 'n-imp-1'});
                const nativePayload = {
                    assets: [{id: 1, title: {text: 'Hello native'}}], link: {url: 'https://example.test/click'},
                };
                const body = {
                    id: 'resp-n', cur: 'USD', seatbid: [{
                        bid: [openrtbBid('n-imp-1', JSON.stringify(nativePayload))],
                    },],
                };

                const result = buildRequestThenInterpret([bid], makeBidderRequest(), body);
                expect(result).to.have.lengthOf(1);
                expect(result[0].mediaType).to.equal('native');
                expect(result[0].native.ortb.assets[0].title.text).to.equal('Hello native');
                expect(result[0].native.ortb.link.url).to.equal('https://example.test/click');
            });
        }

        /**
         * Audio: ortbConverter fillAudioResponse copies bid.adm -> bidResponse.vastXml (DAAST/XML style).
         */
        if (FEATURES.AUDIO) {
            it('should map an audio OpenRTB bid adm to vastXml', function () {
                const bid = makeAudioBid({bidId: 'a-imp-1'});
                const daast = '<?xml version="1.0"?><DAAST></DAAST>';
                const body = {
                    id: 'resp-a', cur: 'EUR', seatbid: [{bid: [openrtbBid('a-imp-1', daast)]}],
                };

                const result = buildRequestThenInterpret([bid], makeBidderRequest(), body);
                expect(result).to.have.lengthOf(1);
                expect(result[0].mediaType).to.equal('audio');
                expect(result[0].vastXml).to.equal(daast);
                expect(result[0].requestId).to.equal('a-imp-1');
                expect(result[0].currency).to.equal('USD');
            });
        }
    });

    describe('getUserSyncs', function () {
        it('should return an empty array (no sync pixels yet)', function () {
            expect(spec.getUserSyncs()).to.deep.equal([]);
        });
    });
});

/*
 * Run locally:
 *   npx eslint "modules/billow_rtb25BidAdapter.js" "test/spec/modules/billow_rtb25BidAdapter_spec.js" --cache --cache-strategy content
 *   npx gulp test --nolint --file test/spec/modules/billow_rtb25BidAdapter_spec.js
 */
