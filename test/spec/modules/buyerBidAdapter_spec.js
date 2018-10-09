import { expect } from 'chai';
import { spec } from 'modules/buyerBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('buyerAdapter', function () {
    const adapter = newBidder(spec);

    describe('isBidRequestValid', function () {
        let bid = {
            'bidder': 'buyer',
            'params': {
                'placement': '6682'
            },
            'sizes': [
                [300, 250]
            ],
            'bidId': '30b31c1838de1e',
            'bidderRequestId': '22edbae2733bf6',
            'auctionId': '1d1a030790a475'
        };

        it('should return true when required params found', function () {
            expect(spec.isBidRequestValid(bid)).to.equal(true);
        });

        it('should return false when required params are not passed', function () {
            let bid = Object.assign({}, bid);
            delete bid.params;
            bid.params = {
                'someIncorrectParam': 0
            };
            expect(spec.isBidRequestValid(bid)).to.equal(false);
        });
    });

    describe('buildRequests', function () {
        let bidRequests = [{
            'bidder': 'buyer',
            'params': {
                'placement': '6682'
            },
            'sizes': [
                [300, 250]
            ],
            'bidId': '30b31c1838de1e',
            'bidderRequestId': '22edbae2733bf6',
            'auctionId': '1d1a030790a475'
        }];

        const request = spec.buildRequests(bidRequests);

        it('sends bid request to our endpoint via GET', function () {
            expect(request.method).to.equal('GET');
        });
    });

    describe('interpretResponse', function () {
        let response = [{
            'cpm': 0.5,
            'width': '300',
            'height': '250',
            'callback_uid': '220ed41385952a',
            'type': 'Default Ad',
            'tag': '<!-- test creative -->',
            'creativeId': '1f99ac5c3ef10a4097499a5686b30aff-6682',
            'requestId': '220ed41385952a',
            'currency': 'EUR',
            'ttl': 60,
            'netRevenue': true,
            'zone': '6682'
        }];

        let expectedResponse = [{
            'requestId': '220ed41385952a',
            'cpm': 0.5,
            'width': '300',
            'height': '250',
            'creativeId': '1f99ac5c3ef10a4097499a5686b30aff-6682',
            'currency': 'EUR',
            'netRevenue': true,
            'ttl': 60,
            'ad': '<!-- test creative -->',
            'mediaType': 'banner',
        }];


        it('should get the correct bid response by display ad', function () {
            let bidderRequest;
            let result = spec.interpretResponse({ body: response }, {bidderRequest});
            expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
        });

        it('handles empty bid response', function () {
            let response = {
                body: {}
            };
            let result = spec.interpretResponse(response);
            expect(result.length).to.equal(0);
        });
    });

    describe('getUserSyncs function', function () {
        it('should register type is iframe', function () {
            const syncOptions = {
                'iframeEnabled': 'true'
            }
            let userSync = spec.getUserSyncs(syncOptions);
            expect(userSync[0].type).to.equal('iframe');
            expect(userSync[0].url).to.equal('https://buyer.dspx.tv/sync');
        });

        it('should register type is image', function () {
            const syncOptions = {
                'pixelEnabled': 'true'
            }
            const serverResponses = [
                {
                    body: {syncUrl: "https://buyer.dspx.tv/syncImg"}
                },
                {
                    body: {syncUrl: "https://buyer.dspx.tv/syncImg2"}
                }
            ];


            let userSync = spec.getUserSyncs(syncOptions);
            expect(userSync[0].type).to.equal('image');
            expect(userSync[0].url).to.equal('https://buyer.dspx.tv/syncImg');
        });
    });
});
