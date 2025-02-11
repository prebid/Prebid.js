import { expect } from 'chai';
import {
  spec,
  ENDPOINT,
  BIDDER_CODE,
} from '../../../modules/eclickadsBidAdapter.js';
import { NATIVE, BANNER, VIDEO } from '../../../src/mediaTypes.js';
import { deepClone } from '../../../src/utils.js';
import { config } from '../../../src/config.js';

describe('eclickadsBidAdapter', () => {
  const bidItem = {
    bidder: BIDDER_CODE,
    params: {
      zid: '7096',
    },
  };
  const eclickadsBidderConfigData = {
    orig_aid: 'xqf7zdmg7the65ac.1718271138.des',
    fosp_aid: '1013000403',
    fosp_uid: '7aab24a4663258a2c1d76a08b20f7e6e',
    id: '84b2a41c4299bb9b8924423e',
    myvne_id: '1013000403',
  };
  const bidRequest = {
    code: 'test-div',
    size: [[320, 85]],
    mediaTypes: {
      [NATIVE]: {
        title: {
          required: true,
        },
        body: {
          required: true,
        },
        image: {
          required: true,
        },
        sponsoredBy: {
          required: true,
        },
        icon: {
          required: false,
        },
      },
    },
    ortb2: {
      device: {
        w: 980,
        h: 1720,
        dnt: 0,
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1',
        language: 'en',
        devicetype: 1,
        make: 'Apple',
        model: 'iPhone 12 Pro Max',
        os: 'iOS',
        osv: '17.4',
      },
      site: {
        name: 'example',
        domain: 'page.example.com',
        page: 'https://page.example.com/here.html',
        ref: 'https://ref.example.com',
        ext: {
          data: eclickadsBidderConfigData,
        },
      },
    },
  };

  describe('isBidRequestValid', () => {
    it('should return false when atleast one of required params is missing', () => {
      const bid = deepClone(bidItem);
      delete bid.params.zid;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
    it('should return true if there is correct required params and mediatype', () => {
      bidItem.params.mediaTypes == NATIVE;
      expect(spec.isBidRequestValid(bidItem)).to.be.true;
    });
    it('should return true if there is no size', () => {
      const bid = deepClone(bidItem);
      delete bid.params.size;
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
  });

  describe('buildRequests', () => {
    const bidList = [bidItem];
    const request = config.runWithBidder(BIDDER_CODE, () =>
      spec.buildRequests(bidList, bidRequest)
    );
    const _data = request.data;

    it('should be create a request to server with POST method, data, valid url', () => {
      expect(request).to.be.exist;
      expect(_data).to.be.exist;
      expect(request.method).to.be.exist;
      expect(request.method).equal('POST');
      expect(request.url).to.be.exist;
      expect(request.url).equal(ENDPOINT + eclickadsBidderConfigData.fosp_uid);
    });
    it('should return valid data format if bid array is valid', () => {
      expect(_data).to.be.an('object');
      expect(_data).to.has.all.keys(
        'deviceWidth',
        'deviceHeight',
        'language',
        'host',
        'ua',
        'page',
        'imp',
        'device',
        'myvne_id',
        'orig_aid',
        'fosp_aid',
        'fosp_uid',
        'id'
      );
      expect(_data.deviceWidth).to.be.an('number');
      expect(_data.deviceHeight).to.be.an('number');
      expect(_data.device).to.be.an('string');
      expect(_data.language).to.be.an('string');
      expect(_data.host).to.be.an('string').that.is.equal('page.example.com');
      expect(_data.page)
        .to.be.an('string')
        .that.is.equal('https://page.example.com/here.html');
      expect(_data.imp).to.be.an('array');
      expect(_data.myvne_id).to.be.an('string');
      expect(_data.orig_aid).to.be.an('string');
      expect(_data.fosp_aid).to.be.an('string');
      expect(_data.myvne_id).to.be.an('string');
      expect(_data.fosp_uid).to.be.an('string');
      expect(_data.id).to.be.an('string');
    });

    it('should return empty array if there is no bidItem passed', () => {
      const request = config.runWithBidder(BIDDER_CODE, () =>
        spec.buildRequests([], bidRequest)
      );
      const _data = request.data;
      expect(_data.imp).to.be.an('array').that.is.empty;
    });

    it('should return the number of imp equal to the number of bidItem', () => {
      expect(_data.imp).to.have.lengthOf(bidList.length);
    });

    it('have to contain required params and correct format for sending to EClickAds', () => {
      const item = _data.imp[0];
      expect(item.zid).to.be.an('string');
    });
  });

  describe('interpretResponse', () => {
    const expectedResponse = {
      id: '84b2a41c4299bb9b8924423e',
      seat: '35809',
      seatbid: [
        {
          id: 'DBCCDFD5-AACC-424E-8225-4160D35CBE5D',
          impid: '35ea1073c745d6c',
          adUnitCode: '8871826dc92e',
          requestId: '1122839202z3v',
          creativeId: '112233ss921v',
          netRevenue: true,
          currency: ['VND'],
          cpm: 0.1844,
          ad: 'eclickads_ad_p',
        },
      ],
    };

    const response = spec.interpretResponse({ body: expectedResponse });

    it('should return an array of offers', () => {
      expect(response).to.be.an('array');
    });

    it('should return empty array if there is no offer from server response', () => {
      const emptyOfferResponse = deepClone(expectedResponse);
      emptyOfferResponse.seatbid = [];
      const response = spec.interpretResponse({ body: emptyOfferResponse });
      expect(response).to.be.an('array').that.is.empty;
    });

    it('should return empty array if seatbid from server response is null or missing', () => {
      const nullOfferResponse = deepClone(expectedResponse);
      nullOfferResponse.seatbid = null;
      const response = spec.interpretResponse({ body: nullOfferResponse });
      expect(response).to.be.an('array').that.is.empty;
    });

    it('should return empty array if server response is get error - empty', () => {
      const response = spec.interpretResponse({ body: undefined });
      expect(response).to.be.an('array').that.is.empty;
    });

    it('should return correct format, params for each of offers from server response', () => {
      const offer = response[0];
      expect(offer.id).to.be.an('string').that.is.not.empty;
      expect(offer.impid).to.be.an('string').that.is.not.empty;
      expect(offer.requestId).to.be.an('string').that.is.not.empty;
      expect(offer.creativeId).to.be.an('string').that.is.not.empty;
      expect(offer.netRevenue).to.be.an('boolean');
      expect(offer.ttl).to.be.an('number');
      expect(offer.cpm).to.be.an('number').greaterThan(0);
      expect(offer.adserverTargeting).to.be.an('object');
      expect(offer.adserverTargeting['hb_ad_eclickads']).to.be.an('string').that
        .is.not.empty;
    });
  });
});
