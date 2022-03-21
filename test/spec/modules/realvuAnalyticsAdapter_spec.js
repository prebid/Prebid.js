import { expect } from 'chai';
import realvuAnalyticsAdapter, { lib } from 'modules/realvuAnalyticsAdapter.js';
import CONSTANTS from 'src/constants.json';

function addDiv(id) {
  let dv = document.createElement('div');
  dv.id = id;
  dv.style.width = '728px';
  dv.style.height = '90px';
  dv.style.display = 'block';
  document.body.appendChild(dv);
  let f = document.createElement('iframe');
  f.width = 728;
  f.height = 90;
  dv.appendChild(f);
  let d = null;
  if (f.contentDocument) d = f.contentDocument; // DOM
  else if (f.contentWindow) d = f.contentWindow.document; // IE
  d.open()
  d.write('<img width="728" height="90" />');
  d.close();
  return dv;
}

describe('RealVu', function() {
  let sandbox;
  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    addDiv('ad1');
    addDiv('ad2');
    sandbox.stub(lib, 'scr');
  });

  afterEach(function () {
    let a1 = document.getElementById('ad1');
    document.body.removeChild(a1);
    let a2 = document.getElementById('ad2');
    document.body.removeChild(a2);
    sandbox.restore();
    realvuAnalyticsAdapter.disableAnalytics();
  });

  after(function () {
    delete window.top1;
    delete window.realvu_aa_fifo;
    delete window.realvu_aa;
    clearInterval(window.boost_poll);
    delete window.boost_poll;
  });

  describe('Analytics Adapter.', function () {
    it('enableAnalytics', function () {
      const config = {
        options: {
          partnerId: '1Y',
          regAllUnits: true
          // unitIds: ['ad1', 'ad2']
        }
      };
      let p = realvuAnalyticsAdapter.enableAnalytics(config);
      expect(p).to.equal('1Y');
    });

    it('checkIn', function () {
      const bid = {
        adUnitCode: 'ad1',
        sizes: [
          [728, 90],
          [970, 250],
          [970, 90]
        ]
      };
      let result = realvuAnalyticsAdapter.checkIn(bid, '1Y');
      const b = Object.assign({}, window.top1.realvu_aa);
      let a = b.ads[0];
      // console.log('a: ' + a.x + ', ' + a.y + ', ' + a.w + ', ' + a.h);
      // console.log('b: ' + b.x1 + ', ' + b.y1 + ', ' + b.x2 + ', ' + b.y2);
      expect(result).to.equal('yes');

      result = realvuAnalyticsAdapter.checkIn(bid); // test invalid partnerId 'undefined'
      result = realvuAnalyticsAdapter.checkIn(bid, ''); // test invalid partnerId ''
    });

    it.skip('isInView returns "yes"', () => {
      let inview = realvuAnalyticsAdapter.isInView('ad1');
      expect(inview).to.equal('yes');
    });

    it('isInView return "NA"', function () {
      const adUnitCode = '1234';
      let result = realvuAnalyticsAdapter.isInView(adUnitCode);
      expect(result).to.equal('NA');
    });

    it('bid response event', function () {
      const config = {
        options: {
          partnerId: '1Y',
          regAllUnits: true
          // unitIds: ['ad1', 'ad2']
        }
      };
      realvuAnalyticsAdapter.enableAnalytics(config);
      const args = {
        'biddercode': 'realvu',
        'adUnitCode': 'ad1',
        'width': 300,
        'height': 250,
        'statusMessage': 'Bid available',
        'adId': '7ba299eba818c1',
        'mediaType': 'banner',
        'creative_id': 85792851,
        'cpm': 0.4308
      };
      realvuAnalyticsAdapter.track({
        eventType: CONSTANTS.EVENTS.BID_RESPONSE,
        args: args
      });
      const boost = Object.assign({}, window.top1.realvu_aa);
      expect(boost.ads[boost.len - 1].bids.length).to.equal(1);

      realvuAnalyticsAdapter.track({
        eventType: CONSTANTS.EVENTS.BID_WON,
        args: args
      });
      expect(boost.ads[boost.len - 1].bids[0].winner).to.equal(1);
    });
  });

  describe('Boost.', function () {
    // const boost = window.top1.realvu_aa;
    let boost;
    beforeEach(function() {
      boost = Object.assign({}, window.top1.realvu_aa);
    });
    it('brd', function () {
      let a1 = document.getElementById('ad1');
      let p = boost.brd(a1, 'Left');
      expect(typeof p).to.not.equal('undefined');
    });

    it('addUnitById', function () {
      let a1 = document.getElementById('ad1');
      let p = boost.addUnitById('1Y', 'ad1');
      expect(typeof p).to.not.equal('undefined');
    });

    it('questA', function () {
      const dv = document.getElementById('ad1');
      let q = boost.questA(dv);
      expect(q).to.not.equal(null);
    });

    it('render', function () {
      let dv = document.getElementById('ad1');
      // dv.style.width = '728px';
      // dv.style.height = '90px';
      // dv.style.display = 'block';
      dv.getBoundingClientRect = false;
      // document.body.appendChild(dv);
      let q = boost.findPosG(dv);
      expect(q).to.not.equal(null);
    });

    it('readPos', function () {
      const a = boost.ads[boost.len - 1];
      let r = boost.readPos(a);
      expect(r).to.equal(true);
    });

    it('send_track', function () {
      const a = boost.ads[boost.len - 1];
      boost.track(a, 'show', '');
      boost.sr = 'a';
      boost.send_track();
      expect(boost.beacons.length).to.equal(0);
    });

    it('questA text', function () {
      let p = document.createElement('p');
      p.innerHTML = 'ABC';
      document.body.appendChild(p);
      let r = boost.questA(p.firstChild);
      document.body.removeChild(p);
      expect(r).to.not.equal(null);
    });

    it('_f=conf', function () {
      const a = boost.ads[boost.len - 1];
      let r = boost.tru(a, 'conf');
      expect(r).to.not.include('_ps=');
    });
  });
});
