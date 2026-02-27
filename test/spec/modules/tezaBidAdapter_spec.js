// test/spec/modules/tezaBidAdapter_spec.js
import { expect } from 'chai';
import { spec } from 'modules/tezaBidAdapter.js';

describe('tezaBidAdapter', function () {
  const bidderRequest = {
    auctionId: 'auc-1',
    timeout: 1200,
    refererInfo: {
      domain: 'localhost',
      page: 'http://localhost/test-teza.html',
    },
    gdprConsent: { gdprApplies: true, consentString: 'CONSENT' },
    uspConsent: '1YNN',
    gppConsent: { gppString: 'GPPSTRING', applicableSections: [7] },
    ortb2: {
      user: { buyeruid: 'u1' },
      device: { dnt: 0 },
      site: { cat: ['IAB1'] },
    },
  };

  const validBid = {
    bidder: 'teza',
    bidId: 'bid-1',
    adUnitCode: 'div-1',
    params: { tagid: 'atagid', account: 'acct123', test: true },
    schain: { ver: '1.0', complete: 1, nodes: [] },
    userIdAsEids: [{ source: 'uid.example', uids: [{ id: 'abc' }] }],
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [320, 50],
        ],
      },
    },
  };

  describe('isBidRequestValid', function () {
    it('returns true when tagid and account exist', function () {
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });
    it('returns false when missing account', function () {
      const b = { ...validBid, params: { tagid: 'atagid' } };
      expect(spec.isBidRequestValid(b)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('builds POST with account & test on query and expected ORTB fields', function () {
      const req = spec.buildRequests([validBid], bidderRequest);
      expect(req.method).to.equal('POST');
      expect(req.url).to.match(
        /^https?:\/\/[^\s]+openrtb2\/auction\?test=1&account=acct123$/
      );
      expect(req.data).to.be.an('object');

      const ortb = req.data;
      expect(ortb.id).to.equal('auc-1');
      expect(ortb.cur).to.deep.equal(['USD']);
      expect(ortb.test).to.equal(1);

      // site
      expect(ortb.site.domain).to.equal('localhost');
      expect(ortb.site.page).to.match(/http:\/\/localhost\/test-teza\.html/);

      // imp
      expect(ortb.imp).to.have.length(1);
      expect(ortb.imp[0].tagid).to.equal('atagid');
      expect(ortb.imp[0].banner.format).to.deep.equal([
        { w: 300, h: 250 },
        { w: 320, h: 50 },
      ]);

      // user/device/regs
      expect(ortb.device).to.be.an('object');
      expect(ortb.user.ext.consent).to.equal('CONSENT');
      expect(ortb.user.ext.eids).to.be.an('array').with.length(1);
      expect(ortb.regs.ext.gdpr).to.equal(1);
      expect(ortb.regs.ext.us_privacy).to.equal('1YNN');
      expect(ortb.regs.gpp).to.equal('GPPSTRING');
      expect(ortb.regs.gpp_sid).to.deep.equal([7]);

      // schain
      expect(ortb.source.ext.schain).to.be.an('object');
    });
  });

  describe('interpretResponse', function () {
    it('maps OpenRTB seatbid to Prebid bids', function () {
      const serverResponse = {
        body: {
          id: 'resp-1',
          cur: 'USD',
          seatbid: [
            {
              seat: 'teza',
              bid: [
                {
                  id: 'b1',
                  impid: 'bid-1',
                  price: 0.5,
                  w: 300,
                  h: 250,
                  crid: 'cr1',
                  adm: '<div>ad</div>',
                  adomain: ['example.com'],
                  nurl: 'https://dsp/win?price=${AUCTION_PRICE}',
                  burl: 'https://dsp/beacon?price=${AUCTION_PRICE}',
                },
              ],
            },
          ],
        },
      };
      const out = spec.interpretResponse(serverResponse, {});
      expect(out).to.have.length(1);
      const b = out[0];
      expect(b.requestId).to.equal('bid-1');
      expect(b.cpm).to.equal(0.5);
      expect(b.width).to.equal(300);
      expect(b.height).to.equal(250);
      expect(b.creativeId).to.equal('cr1');
      expect(b.ad).to.match(/<div>ad<\/div>/);
      expect(b.meta.advertiserDomains).to.deep.equal(['example.com']);
      expect(b.nurl).to.be.a('string');
      expect(b.burl).to.be.a('string');
    });
  });

  describe('onBidWon', function () {
    let OriginalImage;
    let fired;

    beforeEach(function () {
      fired = [];
      OriginalImage = global.Image;

      // Mock with getter+setter to satisfy eslint accessor-pairs
      global.Image = class {
        constructor() {
          this._src = '';
        }
        get src() {
          return this._src;
        }
        set src(url) {
          this._src = url;
          fired.push(url);
        }
      };
    });

    afterEach(function () {
      global.Image = OriginalImage;
    });

    it('pings burl (falls back to nurl) with cleared AUCTION_PRICE macro', function () {
      const bid = {
        burl: 'https://dsp/beacon?price=${AUCTION_PRICE}',
        nurl: 'https://dsp/win?price=${AUCTION_PRICE}',
        cpm: 1.23,
      };
      spec.onBidWon(bid);
      expect(fired).to.have.length(1);
      expect(fired[0]).to.equal('https://dsp/beacon?price=1.23');
    });

    it('uses nurl when burl absent', function () {
      const bid = { nurl: 'https://dsp/win?price=${AUCTION_PRICE}', cpm: 0.5 };
      spec.onBidWon(bid);
      expect(fired[0]).to.equal('https://dsp/win?price=0.5');
    });

    it('does nothing when neither url is present', function () {
      const bid = { cpm: 0.5 };
      spec.onBidWon(bid);
      expect(fired).to.have.length(0);
    });

    describe('alias', function () {
      it('works under alias', function () {
        const vb = { ...validBid, bidder: 'tezaAlias' }; // reuse scoped validBid
        const req = spec.buildRequests([vb], bidderRequest);
        expect(req.url).to.match(/openrtb2\/auction\?test=1&account=acct123$/);
      });
    });
  });
});
