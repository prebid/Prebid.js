import { expect } from 'chai';
import { spec } from '../../../modules/mediaEyesBidAdapter.js';
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
                    bid_floor: 0.1
                }
            }
        ];
        bannerResponse = {
            'body': {
                "id": "6b34f7cc-77d9-4c57-849a-4a2d6e9ca983",
                "seatbid": [
                    {
                        "bid": [
                            {
                                "impid": "3d5d745d841579",
                                "adm": "<img src='https://rtb-useast-v4.upremium.asia/win?i=Y9JuqDwhMOo_0&p=1742356725.249865&price=${AUCTION_PRICE}&f=imp' alt=' ' style='display:none'><a href=\"https://rtb-useast-v4.upremium.asia/click?i=Y9JuqDwhMOo_0&p=1742356725.249865\" target=\"_blank\"><img src=\"https://static.upremium.asia/n1191/ad/300x250_OWMrIjJQ.jpg\" width=\"300\" height=\"250\" border=\"0\" ></a>",
                                "iurl": "https://static.upremium.asia/n1191/ad/300x250_OWMrIjJQ.jpg",
                                "h": 250,
                                "w": 300,
                                "price": 0.25,
                                "crid": "6808551"
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
});
