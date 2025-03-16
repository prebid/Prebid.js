import {expect} from 'chai';
import { NATIVE } from '../../../../src/mediaTypes';
import { interpretNativeBid, OPENRTB } from '../../../../libraries/precisoUtils/bidNativeUtils';

const DEFAULT_PRICE = 1
const DEFAULT_BANNER_WIDTH = 300
const DEFAULT_BANNER_HEIGHT = 250
const BIDDER_CODE = 'test';

describe('bidNativeUtils', function () {
  describe('interpretNativeBid', function () {
    it('should get correct native bid response', function () {
      const adm = {
        native: {
          ver: 1.2,
          link: {
            url: 'https://example.com',
            clicktrackers: 'https://example.com/clktracker'
          },
          eventtrackers: [
            {
              url: 'https://example.com/imptracker'
            }
          ],
          imptrackers: [
            'https://example.com/imptracker'
          ],
          assets: [{
            id: OPENRTB.NATIVE.ASSET_ID.IMAGE,
            required: 1,
            img: {
              url: 'https://example.com/image.jpg',
              w: 150,
              h: 50
            }
          }],
        }
      }
      let bid = {
        id: '123',
        impid: 'b4f290d7-d4ab-4778-ab94-2baf06420b22',
        price: DEFAULT_PRICE,
        adm: JSON.stringify(adm),
        cid: 'test_cid',
        crid: 'test_banner_crid',
        w: DEFAULT_BANNER_WIDTH,
        h: DEFAULT_BANNER_HEIGHT,
        adomain: [],
      }

      let expectedResponse = {
        requestId: 'b4f290d7-d4ab-4778-ab94-2baf06420b22',
        mediaType: NATIVE,
        cpm: DEFAULT_PRICE,
        creativeId: 'test_banner_crid',
        width: 1,
        height: 1,
        ttl: 300,
        netRevenue: true,
        currency: 'USD',
        meta: { advertiserDomains: [] },
        native: {
          clickUrl: encodeURI('https://example.com'),
          impressionTrackers: ['https://example.com/imptracker'],
          image: {
            url: encodeURI('https://example.com/image.jpg'),
            width: 150,
            height: 50
          },
        }
      }

      let result = interpretNativeBid(bid);

      expect(Object.keys(result)).to.have.members(Object.keys(expectedResponse));
    })
  });
});
