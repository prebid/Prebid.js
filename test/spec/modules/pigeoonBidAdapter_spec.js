import { expect } from 'chai';
import { spec, storage } from 'modules/pigeooonBidAdapter.js';
import sinon from 'sinon';

describe('pigeooonBidAdapter', function () {
    const validBid = {
        bidId: 'test-bid-id',
        bidder: 'pigeoon',
        params: {
            networkId: 'net_ABC123',
            placementId: 'placement_123'
        },
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [728, 90]]
            }
        }
    };

    const bidderRequest = {
        auctionId: 'test-auction-id',
        refererInfo: {
            page: 'https://testsite.com'
        }
    };

    const bidderRequestWithGdpr = {
        auctionId: 'test-auction-id',
        refererInfo: {
            page: 'https://testsite.com'
        },
        gdprConsent: {
            consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
            gdprApplies: true
        }
    };

    const bidderRequestGdprNotApplies = {
        auctionId: 'test-auction-id',
        refererInfo: {
            page: 'https://testsite.com'
        },
        gdprConsent: {
            consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
            gdprApplies: false
        }
    };

    describe('isBidRequestValid', function () {
        it('should return true for a valid bid', function () {
            expect(spec.isBidRequestValid(validBid)).to.equal(true);
        });

        it('should return false if networkId is missing', function () {
            const bid = { ...validBid, params: { placementId: 'placement_123' } };
            expect(spec.isBidRequestValid(bid)).to.equal(false);
        });

        it('should return false if placementId is missing', function () {
            const bid = { ...validBid, params: { networkId: 'net_ABC123' } };
            expect(spec.isBidRequestValid(bid)).to.equal(false);
        });

        it('should return false if params are missing', function () {
            const bid = { ...validBid, params: {} };
            expect(spec.isBidRequestValid(bid)).to.equal(false);
        });
    });

    describe('buildRequests', function () {
        let getCookieStub;

        beforeEach(function () {
            getCookieStub = sinon.stub(storage, 'getCookie').returns(null);
        });

        afterEach(function () {
            getCookieStub.restore();
        });

        it('should build a POST request', function () {
            const request = spec.buildRequests([validBid], bidderRequest);
            expect(request.method).to.equal('POST');
            expect(request.url).to.equal('https://pbjs.pigeoon.com/bid');
        });

        it('should use text/plain content type', function () {
            const request = spec.buildRequests([validBid], bidderRequest);
            expect(request.options.contentType).to.equal('text/plain');
        });

        it('should set correct tagid in imp', function () {
            const request = spec.buildRequests([validBid], bidderRequest);
            const data = JSON.parse(request.data);
            expect(data.imp[0].tagid).to.equal('placement_123');
        });

        it('should set correct banner format', function () {
            const request = spec.buildRequests([validBid], bidderRequest);
            const data = JSON.parse(request.data);
            expect(data.imp[0].banner.format).to.deep.equal([
                { w: 300, h: 250 },
                { w: 728, h: 90 }
            ]);
        });

        it('should set correct publisher id', function () {
            const request = spec.buildRequests([validBid], bidderRequest);
            const data = JSON.parse(request.data);
            expect(data.site.publisher.id).to.equal('net_ABC123');
        });

        it('should set gdpr to 0 when no consent', function () {
            const request = spec.buildRequests([validBid], bidderRequest);
            const data = JSON.parse(request.data);
            expect(data.regs.ext.gdpr).to.equal(0);
        });

        it('should set gdpr to 1 when gdprApplies is true', function () {
            const request = spec.buildRequests([validBid], bidderRequestWithGdpr);
            const data = JSON.parse(request.data);
            expect(data.regs.ext.gdpr).to.equal(1);
        });

        it('should set gdpr to 0 when gdprApplies is false', function () {
            const request = spec.buildRequests([validBid], bidderRequestGdprNotApplies);
            const data = JSON.parse(request.data);
            expect(data.regs.ext.gdpr).to.equal(0);
        });

        it('should include consent string when gdpr applies', function () {
            const request = spec.buildRequests([validBid], bidderRequestWithGdpr);
            const data = JSON.parse(request.data);
            expect(data.ext.consent).to.equal('BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA');
        });

        it('should include user id from StorageManager if available', function () {
            getCookieStub.returns('test-user-id');
            const request = spec.buildRequests([validBid], bidderRequest);
            const data = JSON.parse(request.data);
            expect(data.user.id).to.equal('test-user-id');
        });

        it('should set empty user id when cookie is not available', function () {
            const request = spec.buildRequests([validBid], bidderRequest);
            const data = JSON.parse(request.data);
            expect(data.user.id).to.equal('');
        });
    });

    describe('interpretResponse', function () {
        it('should correctly parse bid response', function () {
            const serverResponse = {
                body: {
                    id: 'test-auction-id',
                    cur: 'TRY',
                    seatbid: [{
                        bid: [{
                            impid: 'test-bid-id',
                            price: 11,
                            w: 300,
                            h: 250,
                            adid: '7279818660',
                            adm: 'https://pbjs.pigeoon.com/render?bidId=abc&type=display&w=300&h=250'
                        }]
                    }]
                }
            };

            const bids = spec.interpretResponse(serverResponse);
            expect(bids).to.have.length(1);
            expect(bids[0].cpm).to.equal(11);
            expect(bids[0].currency).to.equal('TRY');
            expect(bids[0].width).to.equal(300);
            expect(bids[0].height).to.equal(250);
            expect(bids[0].adUrl).to.equal('https://pbjs.pigeoon.com/render?bidId=abc&type=display&w=300&h=250');
        });

        it('should return empty array for empty response', function () {
            const bids = spec.interpretResponse({ body: {} });
            expect(bids).to.have.length(0);
        });

        it('should return empty array for null response', function () {
            const bids = spec.interpretResponse({ body: null });
            expect(bids).to.have.length(0);
        });

        it('should default currency to TRY if not provided', function () {
            const serverResponse = {
                body: {
                    id: 'test-auction-id',
                    seatbid: [{
                        bid: [{
                            impid: 'test-bid-id',
                            price: 11,
                            w: 300,
                            h: 250,
                            adid: '123',
                            adm: 'https://pbjs.pigeoon.com/render?bidId=abc'
                        }]
                    }]
                }
            };
            const bids = spec.interpretResponse(serverResponse);
            expect(bids[0].currency).to.equal('TRY');
        });
    });

    describe('getUserSyncs', function () {
        it('should return iframe sync url without gdpr', function () {
            const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], null);
            expect(syncs).to.have.length(1);
            expect(syncs[0].type).to.equal('iframe');
            expect(syncs[0].url).to.equal('https://pbjs.pigeoon.com/sync');
        });

        it('should return iframe sync url with gdpr consent when gdprApplies is true', function () {
            const gdprConsent = {
                consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
                gdprApplies: true
            };
            const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], gdprConsent);
            expect(syncs[0].url).to.include('gdpr=1');
            expect(syncs[0].url).to.include('gdpr_consent=BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA');
        });

        it('should not include gdpr params when gdprApplies is false', function () {
            const gdprConsent = {
                consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
                gdprApplies: false
            };
            const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], gdprConsent);
            expect(syncs[0].url).to.equal('https://pbjs.pigeoon.com/sync');
        });

        it('should return empty array if iframe not enabled', function () {
            const syncs = spec.getUserSyncs({ iframeEnabled: false }, [], null);
            expect(syncs).to.have.length(0);
        });
    });
});