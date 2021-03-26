import {
  proxistoreSubModule,
  _updateBidRequest,
} from '../../../modules/proxistoreRtdProvider.js';
import { expect } from 'chai';

describe('ProxistoreRtdProvider', () => {
  const adUnits = [
    {
      code: 'div-gpt-ad-1460505748561-0',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [300, 600],
            [970, 250],
          ],
        },
      },
      // Replace this object to test a new Adapter!
      bids: [
        {
          bidder: 'proxistore',
          params: { website: 'dhnet.be', language: 'fr' },
          adUnitCode: 'HALFPAGE_CENTER_LOADER',
          transactionId: '92ac333a-a569-4827-abf1-01fc9d19278a',
          sizes: [[300, 600]],
          mediaTypes: {
            banner: {
              filteredSizeConfig: [
                { minViewPort: [1600, 0], sizes: [[300, 600]] },
              ],
              sizeConfig: [
                { minViewPort: [0, 0], sizes: [[300, 600]] },
                { minViewPort: [768, 0], sizes: [[300, 600]] },
                { minViewPort: [1200, 0], sizes: [[300, 600]] },
                { minViewPort: [1600, 0], sizes: [[300, 600]] },
              ],
              sizes: [[300, 600]],
            },
          },
          bidId: '190bab495bc5f6e',
          bidderRequestId: '18c0b0f0c91cd88',
          auctionId: '9bdd917b-908d-4d9f-8f2f-d443277a62fc',
          src: 'client',
          bidRequestsCount: 1,
          bidderRequestsCount: 1,
          bidderWinsCount: 0,
        },
      ],
    },
  ];

  const initVendorConsent = (hasAccepted) => {
    const vendors = [];
    for (let i = 0; i < 53; i++) {
      vendors.push(hasAccepted);
    }
    return vendors;
  };

  const consentWithVendros = {
    gdpr: {
      gdprApplies: true,
      consentString: 'something',
      vendorData: { vendorConsents: initVendorConsent(true) },
    },
  };

  const consentwithoutVendors = {
    gdpr: {
      gdprApplies: true,
      consentString: 'something',
      vendorData: { vendorConsents: initVendorConsent(false) },
    },
  };

  describe('ProxistoreSubmodule', () => {
    it('successfully instantiates', () => {
      expect(proxistoreSubModule.init()).to.equal(true);
    });
  });
  describe('getBidRequest()', () => {
    it('it must always call the callback in any case', () => {
      var callback = sinon.spy();
      proxistoreSubModule.getBidRequestData(
        {adUnits},
        callback,
        null,
        {gdpr: {}}
      );
      expect(callback.called)

      proxistoreSubModule.getBidRequestData(
        {adUnits},
        callback,
        null,
        consentWithVendros
      );
      proxistoreSubModule.getBidRequestData(
        {adUnits},
        callback,
        null,
        consentwithoutVendors
      );
      _updateBidRequest([], adUnits, callback);
      expect(callback.callCount).equal(1);
    // expect(assert.lengthOf(callback.callCount, 3));
    // expect(adUnits[0].bids[0].fpd.user.segments[0]).to.eql([]);
    });
  });
});
