import { expect, assert } from 'chai';
import { spec } from 'modules/kubientBidAdapter.js';

describe('KubientAdapter', function () {
  let bid = {
    bidId: '2dd581a2b6281d',
    bidder: 'kubient',
    bidderRequestId: '145e1d6a7837c9',
    params: {
      zoneid: '5678',
      floor: 0.05,
    },
    auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    transactionId: '3bb2f6da-87a6-4029-aeb0-bfe951372e62',
    schain: {
      ver: '1.0',
      complete: 1,
      nodes: [
        {
          asi: 'example.com',
          sid: '0',
          hp: 1,
          rid: 'bidrequestid',
          domain: 'example.com'
        }
      ]
    }
  };
  let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
  let uspConsentData = '1YCC';
  let bidderRequest = {
    bidderCode: 'kubient',
    auctionId: 'fffffff-ffff-ffff-ffff-ffffffffffff',
    bidderRequestId: 'ffffffffffffff',
    start: 1472239426002,
    auctionStart: 1472239426000,
    timeout: 5000,
    refererInfo: {
      referer: 'http://www.example.com',
      reachedTop: true,
    },
    gdprConsent: {
      consentString: consentString,
      gdprApplies: true
    },
    uspConsent: uspConsentData,
    bids: [bid]
  };
  describe('buildRequests', function () {
    let serverRequests = spec.buildRequests([bid], bidderRequest);
    it('Creates a ServerRequest object with method, URL and data', function () {
      expect(serverRequests).to.be.an('array');
    });
    for (let i = 0; i < serverRequests.length; i++) {
      let serverRequest = serverRequests[i];
      it('Creates a ServerRequest object with method, URL and data', function () {
        expect(serverRequest.method).to.be.a('string');
        expect(serverRequest.url).to.be.a('string');
        expect(serverRequest.data).to.be.a('string');
      });
      it('Returns POST method', function () {
        expect(serverRequest.method).to.equal('POST');
      });
      it('Returns valid URL', function () {
        expect(serverRequest.url).to.equal('https://kssp.kbntx.ch/pbjs');
      });
      it('Returns valid data if array of bids is valid', function () {
        let data = JSON.parse(serverRequest.data);
        expect(data).to.be.an('object');
        expect(data).to.have.all.keys('v', 'requestId', 'adSlots', 'gdpr', 'referer', 'tmax', 'consent', 'consentGiven', 'uspConsent');
        expect(data.v).to.exist.and.to.be.a('string');
        expect(data.requestId).to.exist.and.to.be.a('string');
        expect(data.referer).to.be.a('string');
        expect(data.tmax).to.exist.and.to.be.a('number');
        expect(data.gdpr).to.exist.and.to.be.within(0, 1);
        expect(data.consent).to.equal(consentString);
        expect(data.uspConsent).to.exist.and.to.equal(uspConsentData);
        for (let j = 0; j < data['adSlots'].length; j++) {
          let adSlot = data['adSlots'][i];
          expect(adSlot).to.have.all.keys('bidId', 'zoneId', 'floor', 'sizes', 'schain', 'mediaTypes');
          expect(adSlot.bidId).to.be.a('string');
          expect(adSlot.zoneId).to.be.a('string');
          expect(adSlot.floor).to.be.a('number');
          expect(adSlot.sizes).to.be.an('array');
          expect(adSlot.schain).to.be.an('object');
          expect(adSlot.mediaTypes).to.be.an('object');
        }
      });
    }
  });

  describe('isBidRequestValid', function () {
    it('Should return true when required params are found', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false when required params are not found', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false when params are not found', function () {
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('interpretResponse', function () {
    it('Should interpret response', function () {
      const serverResponse = {
        body:
          {
            seatbid: [
              {
                bid: [
                  {
                    bidId: '000',
                    price: 1.5,
                    adm: '<div>test</div>',
                    creativeId: 'creativeId',
                    w: 300,
                    h: 250,
                    cur: 'USD',
                    netRevenue: false,
                    ttl: 360
                  }
                ]
              }
            ]
          }
      };
      let bannerResponses = spec.interpretResponse(serverResponse);
      expect(bannerResponses).to.be.an('array').that.is.not.empty;
      let dataItem = bannerResponses[0];
      expect(dataItem).to.have.all.keys('requestId', 'cpm', 'ad', 'creativeId', 'width', 'height', 'currency', 'netRevenue', 'ttl');
      expect(dataItem.requestId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].bidId);
      expect(dataItem.cpm).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].price);
      expect(dataItem.ad).to.exist.and.to.be.a('string').and.to.have.string(serverResponse.body.seatbid[0].bid[0].adm);
      expect(dataItem.creativeId).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].creativeId);
      expect(dataItem.width).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].w);
      expect(dataItem.height).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].h);
      expect(dataItem.currency).to.exist.and.to.be.a('string').and.to.equal(serverResponse.body.seatbid[0].bid[0].cur);
      expect(dataItem.netRevenue).to.exist.and.to.be.a('boolean').and.to.equal(serverResponse.body.seatbid[0].bid[0].netRevenue);
      expect(dataItem.ttl).to.exist.and.to.be.a('number').and.to.equal(serverResponse.body.seatbid[0].bid[0].ttl);
    });

    it('Should return no ad when not given a server response', function () {
      const ads = spec.interpretResponse(null);
      expect(ads).to.be.an('array').and.to.have.length(0);
    });
  });

  describe('getUserSyncs', function () {
    it('should register the sync iframe without gdpr', function () {
      let syncOptions = {
        iframeEnabled: true
      };
      let serverResponses = null;
      let gdprConsent = {
        consentString: consentString
      };
      let uspConsent = null;
      let syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent);
      expect(syncs).to.be.an('array').and.to.have.length(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal('https://kdmp.kbntx.ch/init.html?consent_str=' + consentString + '&consent_given=0');
    });
    it('should register the sync iframe with gdpr', function () {
      let syncOptions = {
        iframeEnabled: true
      };
      let serverResponses = null;
      let gdprConsent = {
        gdprApplies: true,
        consentString: consentString
      };
      let uspConsent = null;
      let syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent);
      expect(syncs).to.be.an('array').and.to.have.length(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal('https://kdmp.kbntx.ch/init.html?consent_str=' + consentString + '&gdpr=1&consent_given=0');
    });
    it('should register the sync iframe with gdpr vendor', function () {
      let syncOptions = {
        iframeEnabled: true
      };
      let serverResponses = null;
      let gdprConsent = {
        gdprApplies: true,
        consentString: consentString,
        apiVersion: 1,
        vendorData: {
          vendorConsents: {
            794: 1
          }
        }
      };
      let uspConsent = null;
      let syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent);
      expect(syncs).to.be.an('array').and.to.have.length(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal('https://kdmp.kbntx.ch/init.html?consent_str=' + consentString + '&gdpr=1&consent_given=1');
    });
    it('should register the sync image without gdpr', function () {
      let syncOptions = {
        pixelEnabled: true
      };
      let serverResponses = null;
      let gdprConsent = {
        consentString: consentString
      };
      let uspConsent = null;
      let syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent);
      expect(syncs).to.be.an('array').and.to.have.length(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.equal('https://kdmp.kbntx.ch/init.png?consent_str=' + consentString + '&consent_given=0');
    });
    it('should register the sync image with gdpr', function () {
      let syncOptions = {
        pixelEnabled: true
      };
      let serverResponses = null;
      let gdprConsent = {
        gdprApplies: true,
        consentString: consentString
      };
      let uspConsent = null;
      let syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent);
      expect(syncs).to.be.an('array').and.to.have.length(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.equal('https://kdmp.kbntx.ch/init.png?consent_str=' + consentString + '&gdpr=1&consent_given=0');
    });
    it('should register the sync image with gdpr vendor', function () {
      let syncOptions = {
        pixelEnabled: true
      };
      let serverResponses = null;
      let gdprConsent = {
        gdprApplies: true,
        consentString: consentString,
        apiVersion: 2,
        vendorData: {
          vendor: {
            consents: {
              794: 1
            }
          }
        }
      };
      let uspConsent = null;
      let syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent);
      expect(syncs).to.be.an('array').and.to.have.length(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.equal('https://kdmp.kbntx.ch/init.png?consent_str=' + consentString + '&gdpr=1&consent_given=1');
    });
  })
});
