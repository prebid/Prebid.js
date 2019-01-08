import { spec } from 'modules/open8BidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const ENDPOINT = '//as.vt.open8.com/v1/control/prebid';

describe('Open8Adapter', function() {
        const adapter = newBidder(spec);
        
        describe('isBidRequestValid', function() {
                let bid = {
                    'bidder': 'open8',
                    'params': {
                        'slotId': '123456'
                    },
                    'adUnitCode': 'adunit',
                    'sizes': [[300, 250]],
                    'bidId': 'bidid1234',
                    'bidderRequestId': 'requestid1234',
                    'auctionId': 'auctionid1234',
                };
                
                it('should return true when required params found', function() {
                        expect(spec.isBidRequestValid(bid)).to.equal(true);
                });
                
                it('should return false when required params are not passed', function() {
                        let bid = Object.assign({}, bid);
                        delete bid.params;
                        bid.params = {
                            ' slotId': 0
                        };
                        expect(spec.isBidRequestValid(bid)).to.equal(false);
                });
        });
        
        describe('buildRequests', function() {
                let bidRequests = [
                {
                    'bidder': 'open8',
                    'params': {
                        'slotId': '123456'
                    },
                    'adUnitCode': 'adunit',
                    'sizes': [[300, 250]],
                    'bidId': 'bidid1234',
                    'bidderRequestId': 'requestid1234',
                    'auctionId': 'auctionid1234',
                }
                ];
                
                it('sends bid request to ENDPOINT via GET', function() {
                        const requests = spec.buildRequests(bidRequests);
                        expect(requests[0].url).to.equal(ENDPOINT);
                        expect(requests[0].method).to.equal('GET');
                });
        });
        describe('interpretResponse', function() {
                let response = {
                    slotId: 2,
                    userId: 'userid1234',
                    impId: 0.9876543,
                    media: 'TEST_MEDIA',
                    isAdReturn: true,
                    syncPixels: ['https://open8test.blob.core.windows.net/public/dbm/dotimage.gif'], // ['https://cm.g.doubleclick.net/pixel?google_nid=open8_dbm&google_cm&google_sc'],
                    syncIFs: [],
                    ad: {
                        bidId: 'TEST_BID_ID',
                        price: 1234.56,
                        creativeId: 'creativeid1234',
                        dealId: 'TEST_DEAL_ID',
                        currency: 'JPY',
                        adType: 2,
                        banner: {
                            w: 300,
                            h: 250,
                            adm: '<div></div>',
                            imps: [
                            '//example.com/imp'
                            ]
                        }
                    }
                };
                
                it('should get correct banner bid response', function() {
                        let expectedResponse = [
                        {
                            'slotId': 2,
                            'userId': 'userid1234',
                            'impId': 0.9876543,
                            'media': 'TEST_MEDIA',
                            'requestId': 'requestid1234',
                            'cpm': 1234.56,
                            'creativeId': 'creativeid1234',
                            'dealId': 'TEST_DEAL_ID',
                            'width': 300,
                            'height': 250,
                            'ad': "<div></div><img src='//example.com/imp' />",
                            'mediaType': 'banner',
                            'currency': 'JPY',
                            'ttl': 360,
                            'netRevenue': true
                        }
                        ];
                        
                        let bidderRequest;
                        let result = spec.interpretResponse({ body: response }, { bidderRequest });
                        expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
                });
                
                it('handles video responses', function() {
                        let response = {
                            slotId: 2,
                            userId: 'userid1234',
                            impId: Math.random(),
                            media: 'TEST_MEDIA',
                            isAdReturn: true,
                            syncPixels: ['https://open8test.blob.core.windows.net/public/dbm/dotimage.gif'], // ['https://cm.g.doubleclick.net/pixel?google_nid=open8_dbm&google_cm&google_sc'],
                            syncIFs: [],
                            ad: {
                                bidId: 'TEST_BID_ID',
                                price: 1234.56,
                                creativeId: 'creativeid1234',
                                dealId: 'TEST_DEAL_ID',
                                currency: 'JPY',
                                adType: 1,
                                video: {
                                    purl: 'https://open8test.blob.core.windows.net/public/dbm/prebid-bigoverlay.js',
                                    vastXml: '<VAST></VAST>',
                                    w: 320,
                                    h: 180
                                },
                            }
                        };
                        
                        let bidderRequest;
                        let result = spec.interpretResponse({ body: response }, { bidderRequest });
                        expect(result[0]).to.have.property('vastXml');
                        expect(result[0]).to.have.property('renderer');
                        expect(result[0]).to.have.property('mediaType', 'video');
                });
                
                it('handles nobid responses', function() {
                        let response = {
                            isAdReturn: false,
                            'ad': {}
                        };
                        
                        let bidderRequest;
                        let result = spec.interpretResponse({ body: response }, { bidderRequest });
                        expect(result.length).to.equal(0);
                });
        });
        
        describe('getUserSyncs', function() {
                const bidResponse1 = {
                    body: {
                        'isAdReturn': true,
                        'ad': { /* ad body */ },
                        'syncPixels': [
                        'https://example.test/1'
                        ]
                    }
                };
                
                const bidResponse2 = {
                    body: {
                        'isAdReturn': true,
                        'ad': { /* ad body */ },
                        'syncPixels': [
                        'https://example.test/2'
                        ]
                    }
                };
                
                it('should use a sync url from first response', function() {
                        const syncs = spec.getUserSyncs({ pixelEnabled: true }, [bidResponse1, bidResponse2]);
                        expect(syncs).to.deep.equal([
                            {
                                type: 'image',
                                url: 'https://example.test/1'
                            }
                        ]);
                });
                
                it('handle empty response (e.g. timeout)', function() {
                        const syncs = spec.getUserSyncs({ pixelEnabled: true }, []);
                        expect(syncs).to.deep.equal([]);
                });
                
                it('returns empty syncs when not enabled', function() {
                        const syncs = spec.getUserSyncs({ pixelEnabled: false }, [bidResponse1]);
                        expect(syncs).to.deep.equal([]);
                });
        });
});
