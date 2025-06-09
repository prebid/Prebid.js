import { expect } from 'chai';
import { spec } from '../../../modules/mediaeyesBidAdapter.js';
import * as utils from '../../../src/utils.js';

describe('mediaeyes adapter', function () {
    let request;
    let bannerResponse, invalidResponse;

    beforeEach(function () {
        request = [
            {
                bidder: 'mediaeyes',
                mediaTypes: {
                    banner: {
                        sizes: [[300, 250]]
                    }
                },
                params: {
                    itemId: 'ec1d7389a4a5afa28a23c4',
                    bidFloor: 0.1
                }
            }
        ];
        bannerResponse = {
            'body': {
                "id": "3c51f851-56d8-4513-b4bb-e5a1612cede3",
                "seatbid": [
                  {
                    "bid": [
                      {
                        "impid": "3db1c7f2867eb3",
                        "adm": "<img src='https://rtb-useast-v4.upremium.asia/win?i=JdyhDKuBUwA_0&p=1744253265.249865&price=${AUCTION_PRICE}&f=imp' alt=' ' style='display:none'><a href=\"https://rtb-useast-v4.upremium.asia/click?i=JdyhDKuBUwA_0&p=1744253265.249865\" target=\"_blank\"><img src=\"https://static.upremium.asia/n1191/ad/300x250_OWMrIjJQ.jpg\" width=\"300\" height=\"250\" border=\"0\" ></a>",
                        "iurl": "https://static.upremium.asia/n1191/ad/300x250_OWMrIjJQ.jpg",
                        "h": 250,
                        "w": 300,
                        "price": 0.25,
                        "crid": "6808551",
                        "adomain": [
                          "google.com"
                        ],
                        "ext": {
                          "advertiser_name": "urekamedia",
                          "agency_name": "urekamedia"
                        }
                      }
                    ]
                  }
                ]
            }
        };
        invalidResponse = {
            'body': {

            }
        };
    });

    describe('validations', function () {
        it('isBidValid : itemId is passed', function () {
            let bid = {
                bidder: 'mediaeyes',
                params: {
                    itemId: 'ec1d7389a4a5afa28a23c4',
                }
            },
                isValid = spec.isBidRequestValid(bid);
            expect(isValid).to.equals(true);
        });
        it('isBidValid : itemId is not passed', function () {
            let bid = {
                bidder: 'mediaeyes',
                params: {

                }
            },
                isValid = spec.isBidRequestValid(bid);
            expect(isValid).to.equals(false);
        });
    });
    describe('Validate Request', function () {
        it('Immutable bid request validate', function () {
            let _Request = utils.deepClone(request),
                bidRequest = spec.buildRequests(request);
            expect(request).to.deep.equal(_Request);
        });
    });

    describe('responses processing', function () {
        it('should return fully-initialized banner bid-response', function () {
            let bidRequest = spec.buildRequests(request);

            let resp = spec.interpretResponse(bannerResponse, bidRequest[0])[0];
            expect(resp).to.have.property('requestId');
            expect(resp).to.have.property('cpm');
            expect(resp).to.have.property('width');
            expect(resp).to.have.property('height');
            expect(resp).to.have.property('creativeId');
            expect(resp).to.have.property('currency');
            expect(resp).to.have.property('ttl');
            expect(resp).to.have.property('ad');
            expect(resp).to.have.property('meta');
        });

        it('no ads returned', function () {
            let response = {
                "body": {
                    "id": "0309d787-75cd-4e9d-a430-666fc76c1fbe",
                    "seatbid": [
                      {
                        "bid": []
                      }
                    ]
                }
            }
            let bidderRequest;

            let result = spec.interpretResponse(response, {bidderRequest});
            expect(result.length).to.equal(0);
        });
    })

    describe('setting imp.floor using floorModule', function () {
        let newRequest;
        let floorModuleTestData;
        let getFloor = function (req) {
            return floorModuleTestData['banner'];
        };

        beforeEach(() => {
            floorModuleTestData = {
                'banner': {
                    'currency': 'USD',
                    'floor': 1,
                },
            };
            newRequest = utils.deepClone(request);
            newRequest[0].getFloor = getFloor;
        });

        it('params bidfloor undefined', function () {
            floorModuleTestData.banner.floor = 0;
            newRequest[0].params.bidFloor = undefined;
            let request = spec.buildRequests(newRequest);
            let data = JSON.parse(request[0].data);
            data = data.imp[0];
            expect(data.bidfloor).to.equal(0);
        });

        it('floormodule if floor is not number', function () {
            floorModuleTestData.banner.floor = 'INR';
            newRequest[0].params.bidFloor = undefined;
            let request = spec.buildRequests(newRequest);
            let data = JSON.parse(request[0].data);
            data = data.imp[0];
            expect(data.bidfloor).to.equal(0);
        });

        it('floormodule if currency is not matched', function () {
            floorModuleTestData.banner.currency = 'INR';
            newRequest[0].params.bidFloor = undefined;
            let request = spec.buildRequests(newRequest);
            let data = JSON.parse(request[0].data);
            data = data.imp[0];
            expect(data.bidfloor).to.equal(1);
        });

        it('bidFloor is not passed, use minimum from floorModule', function () {
            newRequest[0].params.bidFloor = undefined;
            let request = spec.buildRequests(newRequest);
            let data = JSON.parse(request[0].data);
            data = data.imp[0];
            expect(data.bidfloor).to.equal(1);
        });

        it('if params bidFloor is passed, priority use it', function () {
            newRequest[0].params.bidFloor = 1;
            let request = spec.buildRequests(newRequest);
            let data = JSON.parse(request[0].data);
            data = data.imp[0];
            expect(data.bidfloor).to.equal(1);
        });
    });
});
