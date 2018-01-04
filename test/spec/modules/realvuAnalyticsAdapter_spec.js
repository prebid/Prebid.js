// jshint esversion: 6
import {
  expect
} from 'chai';
import realvuAnalyticsAdapter from '../../../modules/realvuAnalyticsAdapter';
import CONSTANTS from 'src/constants.json';

function addDiv(id) {
  let dv = document.createElement('div');
  dv.id = id;
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

describe('RealVu Analytics Adapter.', () => {
  before(() => {
    addDiv('ad1');
    addDiv('ad2');
  });
  after(() => {
    let a1 = document.getElementById('ad1');
    document.body.removeChild(a1);
    let a2 = document.getElementById('ad2');
    document.body.removeChild(a2);
  });

  it('enableAnalytics', () => {
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

  it('checkIn', () => {
    const bid = {
      placementCode: 'ad1',
      sizes: [
        [728, 90],
        [970, 250],
        [970, 90]
      ]
    };
    let result = realvuAnalyticsAdapter.checkIn(bid, '1Y');
    const b = window.top1.realvu_aa;
    let a = b.ads[0];
    // console.log('a: ' + a.x + ', ' + a.y + ', ' + a.w + ', ' + a.h);
    // console.log('b: ' + b.x1 + ', ' + b.y1 + ', ' + b.x2 + ', ' + b.y2);
    expect(result).to.equal('yes');
    document.body.removeChild(ad_div);
  });

  it('isInView returns "yes"', () => {
    let ad_div = addDiv('ad1');
    const sizes = [[728, 90], [970, 250], [970, 90]];
    let result = realvuAnalyticsAdapter.checkIn('ad1', sizes, '1Y');
    let inview = realvuAnalyticsAdapter.isInView('ad1');
    expect(inview).to.equal('yes');
    document.body.removeChild(ad_div);
  });

  it('isInView return "NA"', () => {
    const placementCode = '1234';
    let result = realvuAnalyticsAdapter.isInView(placementCode);
    expect(result).to.equal('NA');
  });

  it('bid response event', () => {
    const config = {
      options: {
        partnerId: '1Y',
        regAllUnits: false,
        unitIds: ['ad1', 'ad2']
      }
    };
    const hb = $$PREBID_GLOBAL$$;
    const sz = [[728, 90], [970, 250], [970, 90]];
    hb.adUnits = [{
      code: 'ad1',
      sizes: sz
    }, {
      code: 'ad2',
      sizes: sz
    }];
    var ad_div1 = addDiv('ad1');
    var ad_div2 = addDiv('ad2');
    realvuAnalyticsAdapter.enableAnalytics(config);
    realvuAnalyticsAdapter.track({
      eventType: CONSTANTS.EVENTS.AUCTION_INIT,
      args: null
    });
    const boost = window.top1.realvu_aa;
    expect(boost.ads[0].bids.length).to.equal(1);

    realvuAnalyticsAdapter.track({
      eventType: CONSTANTS.EVENTS.BID_WON,
      args: args
    });
    expect(boost.ads[0].bids[0].winner).to.equal(1);
  });

  it('test boost getViewStatusById', () => {
    let boost = window.top1.realvu_boost;
    let ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    let u = {
      partnerId: '1Y',
      unit: ad_div
    };
    boost.addUnit(u);
    let vst = boost.getViewStatusById('ad1');
    expect(vst).to.equal('yes');
    document.body.removeChild(ad_div);
  });

  it('test boost exp', () => {
    let boost = window.top1.realvu_boost;
    let partnerId = '1Y';
    let ad_div = document.createElement('div');
    ad_div.id = 'ad7';
    ad_div.style = 'width:300px; height:250px;';
    document.body.appendChild(ad_div);
    boost.addUnitById(partnerId, 'ad7');
    let a = boost.ads[boost.ads.length - 1];
    a.frm = boost.newf(a, 300, 250);
    a.div.appendChild(a.frm);
    boost.exp(a);
    let t = a.frm.tagName;
    expect(t).to.equal('IFRAME');
    document.body.removeChild(ad_div);
  });

  it('test boost updateMem', () => {
    let boost = window.top1.realvu_boost;
    boost.updateMem('test1', 'test1Value');
    let valueTest1 = boost.getMem('test1');
    expect(valueTest1).to.equal('test1Value');
  });

  it('test boost writePos/readPos', () => {
    let boost = window.top1.realvu_boost;
    let a = {
      pins: [{
        unit_id: 'ad1',
        score: 10,
        state: 1,
        mode: 'tx2'
      }],
      x: 150,
      y: 275,
      w: 300,
      h: 250
    };
    boost.writePos(a);
    let torf = boost.readPos(a);
    expect(torf).to.equal(true);
  });

  it('test boost questA param is null', () => {
    let boost = window.top1.realvu_boost;
    let rtn = boost.questA(null);
    expect(rtn).to.equal(null);
  });

  it('questA', () => {
    const dv = document.getElementById('ad1');
    let q = boost.questA(dv);
    expect(q).to.not.equal(null);
  });

  it('render', () => {
    let dv = document.getElementById('ad1');
    // dv.style.width = '728px';
    // dv.style.height = '90px';
    // dv.style.display = 'block';
    dv.getBoundingClientRect = false;
    // document.body.appendChild(dv);
    let q = boost.findPosG(dv);
    expect(q).to.not.equal(null);
  });

  it('readPos', () => {
    const a = boost.ads[0];
    let r = boost.readPos(a);
    expect(r).to.equal(true);
  });

  it('test boost brd', () => {
    let ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    let boost = window.top1.realvu_boost;
    let s = ad_div;
    let p = 'Left';
    let f = boost.brd(s, p);
    expect(f).to.be.greaterThan(-1);
    document.body.removeChild(ad_div);
  });

  /*
  it('test boost incrMem', () => {
    let boost = window.top1.realvu_boost;
    boost.ads = [{
      score: 10,
      pins: {
        unit_id: 'ad1',
        score: 10,
        state: 1,
        mode: 'tx2',
        size: '300x250'
      }
    }, {
      score: 17,
      pins: {
        unit_id: 'ad2',
        score: 17,
        state: 1,
        mode: 'tx2',
        size: '300x250'
      }
    }];

    boost.incrMem(0, 'r');
    expect(boost.ads[0].score).to.equal((boost.ads[0].score << 1) & 0xFFFFF);

    boost.incrMem(1, 'v');
    expect(boost.ads[1].score).to.equal((boost.ads[0].score |= 1) & 0xFFFFF);
  }); */
});
