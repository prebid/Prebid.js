import {
  _sendAdToCreative
} from '../../../src/secureCreatives.js';
import { expect } from 'chai';
import * as utils from 'src/utils.js';

describe('secureCreatives', () => {
  describe('_sendAdToCreative', () => {
    beforeEach(function () {
      sinon.stub(utils, 'logError');
      sinon.stub(utils, 'logWarn');
    });

    afterEach(function () {
      utils.logError.restore();
      utils.logWarn.restore();
    });
    it('should macro replace ${AUCTION_PRICE} with the winning bid for ad and adUrl', () => {
      const oldVal = window.googletag;
      const oldapntag = window.apntag;
      window.apntag = null
      window.googletag = null;
      const mockAdObject = {
        adId: 'someAdId',
        ad: '<script src="http://prebid.org/creative/${AUCTION_PRICE}"></script>',
        adUrl: 'http://creative.prebid.org/${AUCTION_PRICE}',
        width: 300,
        height: 250,
        renderer: null,
        cpm: '1.00',
        adUnitCode: 'some_dom_id'
      };
      const remoteDomain = '*';
      const source = {
        postMessage: sinon.stub()
      };

      _sendAdToCreative(mockAdObject, remoteDomain, source);
      expect(JSON.parse(source.postMessage.args[0][0]).ad).to.equal('<script src="http://prebid.org/creative/1.00"></script>');
      expect(JSON.parse(source.postMessage.args[0][0]).adUrl).to.equal('http://creative.prebid.org/1.00');
      window.googletag = oldVal;
      window.apntag = oldapntag;
    });
  });
});
