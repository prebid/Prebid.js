const chai = require('chai');
const expect = require('chai').expect;
const Adapter = require('src/adapters/sonobi');
const bidManager = require('src/bidmanager');
const adLoader = require('src/adloader');
const utils = require('src/utils');

chai.config.includeStack = true;

describe('Sonobi adapter tests', () => {
  //  Declared each explicitely so we can loop through and observe each test
  const adUnit_p = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_p',
      sizes: [[300, 250], [300, 600]],
      params: {
        placement_id: '1a2b3c4d5e6f1a2b3c4d'
      }
    }]
  };
  const adUnit_pd = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_pd',
      sizes: [[300, 250], [300, 600]],
      params: {
        placement_id: '1a2b3c4d5e6f1a2b3c4d',
        dom_id: 'div-gpt-ad-12345-0'
      }
    }]
  };
  const adUnit_pdf = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_pdf',
      sizes: [[300, 250], [300, 600]],
      params: {
        placement_id: '1a2b3c4d5e6f1a2b3c4d',
        dom_id: 'div-gpt-ad-12345-0',
        floor: '1'
      }
    }]
  };
  const adUnit_a = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_a',
      sizes: [[300, 250], [300, 600]],
      params: {
        ad_unit: '/7780971/sparks_prebid_MR',
      }
    }]
  };

  const adUnit_as = {
    code: 'sbi_s',
    sizes: [[120, 600], [300, 600], [160, 600]],
    bids: [{
      bidder: 'sonobi',
      params: {
        ad_unit: '/7780971/sparks_prebid_LB',
        sizes: [[300, 250], [300, 600]]
      }
    }]
  };

  const adUnit_ad = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_ad',
      sizes: [[300, 250], [300, 600]],
      params: {
        ad_unit: '/7780971/sparks_prebid_MR',
        dom_id: 'div-gpt-ad-12345-0'
      }
    }]
  };
  const adUnit_af = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_af',
      sizes: [[300, 250], [300, 600]],
      params: {
        ad_unit: '/7780971/sparks_prebid_MR',
        floor: '1'
      }
    }]
  };
  const adUnit_adf = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_adf',
      sizes: [[300, 250], [300, 600]],
      params: {
        ad_unit: '/7780971/sparks_prebid_MR',
        dom_id: 'div-gpt-ad-12345-0',
        floor: '1'
      }
    }]
  };
  const adUnit_A = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_A',
      sizes: [[300, 250], [300, 600]],
      params: {
        ad_unit: '/7780971/sparks_prebid_MR',
      }
    }]
  };
  const adUnit_Ad = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_Ad',
      sizes: [[300, 250], [300, 600]],
      params: {
        ad_unit: '7780971/sparks_prebid_MR',
        dom_id: 'div-gpt-ad-12345-0'
      }
    }]
  };
  const adUnit_Af = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_Af',
      sizes: [[300, 250], [300, 600]],
      params: {
        ad_unit: '7780971/sparks_prebid_MR',
        floor: '1'
      }
    }]
  };
  const adUnit_Adf = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_Adf',
      sizes: [[300, 250], [300, 600]],
      params: {
        ad_unit: '7780971/sparks_prebid_MR',
        dom_id: 'div-gpt-ad-12345-0',
        floor: '1'
      }
    }]
  };
  //  You guys surprise me all the time new and exciting ways to break this simple adapter.
  const adUnit_m1hb = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_m1hb',
      sizes: [[300, 250], [300, 600]],
      params: {
        ad_unit: '1a2b3c4d5e6f1a2b3c4d',
        dom_id: 'div-gpt-ad-12345-0'
      }
    }]
  };
  const adUnit_m2hb = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_m2hb',
      sizes: [[300, 250], [300, 600]],
      params: {
        ad_unit: '/7780971/sparks_prebid_MR',
        placement_id: 'OPTIONAL',
        dom_id: 'div-gpt-ad-12345-0',
      }
    }]
  };
  const adUnit_m3hb = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_m3hb',
      sizes: [[300, 250], [300, 600]],
      params: {
        ad_unit: '/7780971/sparks_prebid_MR',
        placement_id: '',
        dom_id: 'div-gpt-ad-12345-0',
      }
    }]
  };
  const adUnit_m4hb = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_m4hb',
      sizes: [[300, 250], [300, 600]],
      params: {
        ad_unit: '',
        placement_id: '1a2b3c4d5e6f1a2b3c4d',
        dom_id: 'div-gpt-ad-12345-0'
      }
    }]
  };
  const adUnit_m5hb = {
    bidderCode: 'sonobi',
    bids: [{
      bidId: 'testbid',
      bidder: 'sonobi',
      placementCode: 'adUnit_m5hb',
      sizes: [[300, 250], [300, 600]],
      params: {
        placement_id: '/7780971/sparks_prebid_MR',
        dom_id: 'div-gpt-ad-12345-0'
      }
    }]
  };
  //  FTFY
  const sbi_adUnits = {
    'adUnit_p': adUnit_p,
    'adUnit_pd': adUnit_pd,
    'adUnit_pdf': adUnit_pdf,
    'adUnit_a': adUnit_a,
    'adUnit_as': adUnit_as,
    'adUnit_ad': adUnit_ad,
    'adUnit_af': adUnit_af,
    'adUnit_adf': adUnit_adf,
    'adUnit_A': adUnit_A,
    'adUnit_Ad': adUnit_Ad,
    'adUnit_Af': adUnit_Af,
    'adUnit_Adf': adUnit_Adf,
    'adUnit_m1hb': adUnit_m1hb,
    'adUnit_m2hb': adUnit_m2hb,
    'adUnit_m3hb': adUnit_m3hb,
    'adUnit_m4hb': adUnit_m4hb,
    'adUnit_m5hb': adUnit_m5hb
  };

  //  Run the same test against all the (now tons of) different configurations
  utils._each(sbi_adUnits, (adUnit, adUnitName) => {
    describe('should form valid bid requests', () => {
      let adapter = new Adapter();
      let stubLoadScript;
      let stubFailBid;
      let stubGoodBid;

      beforeEach(() => {
        stubLoadScript = sinon.stub(adLoader, 'loadScript');
        stubFailBid = sinon.stub(adapter, 'failure');
        stubGoodBid = sinon.stub(adapter, 'success');
      });

      afterEach(() => {
        stubLoadScript.restore();
        stubFailBid.restore();
        stubGoodBid.restore();
      });

      it('should make trinity key:vals for: ' + adUnitName, () => {
        let keymakerBid = adapter.formRequest(adUnit.bids);
        //  Key matches one of two patterns and chai doesn't have an 'or' clause.
        expect(Object.keys(keymakerBid)[0]).to.exist;
        expect(Object.keys(keymakerBid)[0]).to.not.be.empty;
        expect(keymakerBid[Object.keys(keymakerBid)[0]]).to.exist;
        expect(keymakerBid[Object.keys(keymakerBid)[0]]).to.not.be.empty;
        //  Just having a key and val is sufficient for bidder to attempt to work with it.
      });

      it('should attempt to call bidder for: ' + adUnitName, () => {
        adapter.callBids(adUnit);
        expect(stubLoadScript.callCount).to.equal(1);
        expect(stubFailBid.callCount).to.equal(0);
      });
    });
  });

  describe('should parse bid returns and register bid objects', () => {
    let adapter = new Adapter();
    let spyAddBidResponse;
    let stubFailBid;
    let stubGoodBid;

    const sbi_bid = {
      'slots':
      {
        'sbi_a':
        {
          'sbi_size': '300x250',
          'sbi_apoc': 'premium',
          'sbi_aid': '159.60.7533347',
          'sbi_mouse': 4.20
        }
      },
      'sbi_dc': 'mco-1-'
    };

    const sbi_video_bid = {
      'slots':
      {
        'sbi_a':
        {
          'sbi_size': 'outstream',
          'sbi_apoc': 'premium',
          'sbi_aid': '159.60.7533347',
          'sbi_mouse': 4.20,
        }
      },
      'sbi_dc': 'mco-1-'
    };

    const sbi_deal_bid = {
      'slots':
      {
        'sbi_a':
        {
          'sbi_size': '300x250',
          'sbi_apoc': 'premium',
          'sbi_aid': '159.60.7533347',
          'sbi_mouse': 4.20,
          'sbi_dozer': 'apex-test-deal'
        }
      },
      'sbi_dc': 'mco-1-'
    };

    const sbi_noBid = {
      'slots':
      {
        'sbi_a': {}
      },
      'sbi_dc': 'mco-1-'
    };

    beforeEach(() => {
      spyAddBidResponse = sinon.spy(bidManager, 'addBidResponse');
      stubFailBid = sinon.stub(adapter, 'failure');
      stubGoodBid = sinon.stub(adapter, 'success');
    });

    afterEach(() => {
      spyAddBidResponse.restore();
      stubFailBid.restore();
      stubGoodBid.restore();
    });

    it('should create bid object for good bid return', () => {
      adapter.parseResponse(sbi_bid);
      expect(spyAddBidResponse.called).to.be.true;
      expect(stubFailBid.callCount).to.equal(0);
    });

    it('should create bid object for outstream video bid return', () => {
      adapter.parseResponse(sbi_video_bid);
      expect(spyAddBidResponse.called).to.be.true;
      expect(stubFailBid.callCount).to.equal(0);
    });

    it('should create bid object for deal bid return', () => {
      adapter.parseResponse(sbi_deal_bid);
      expect(spyAddBidResponse.called).to.be.true;
      expect(stubFailBid.callCount).to.equal(0);
    });

    it('should create fail bid object for empty return', () => {
      adapter.parseResponse(sbi_noBid);
      expect(spyAddBidResponse.called).to.be.true;
      expect(stubGoodBid.callCount).to.equal(0);
    });
  });
});
