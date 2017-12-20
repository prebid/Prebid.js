// jshint esversion: 6
import {expect} from 'chai';
import realvuAnalyticsAdapter from '../../../modules/realvuAnalyticsAdapter';
import CONSTANTS from 'src/constants.json';

function addDiv(id) {
  let dv = document.createElement('div');
  dv.id = id;
  document.body.appendChild(dv);
  return dv;
}

describe('RealVu Analytics Adapter Test.', () => {
  it('checkIn returns "yes"', () => {
    let ad_div = addDiv('ad1');
    const sizes = [[728, 90], [970, 250], [970, 90]];
    let result = realvuAnalyticsAdapter.checkIn('ad1', sizes, '1Y');
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

  it('test enableAnalytics', () => {
    const boost = window.top1.realvu_boost;
    const config = {
      options: {
        partnerId: '1Y',
        regAllUnits: true
        // unitIds: ['ad1', 'ad2']
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
    expect(boost.ads.length).to.equal(2);
    document.body.removeChild(ad_div1);
    document.body.removeChild(ad_div2);
  });

  it('test enableAnalytics !regAllUnits', () => {
    const boost = window.top1.realvu_boost;
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
    expect(boost.ads.length).to.equal(2);
    document.body.removeChild(ad_div1);
    document.body.removeChild(ad_div2);
  });

  it('test boost adUnitById', () => {
    const boost = window.top1.realvu_boost;
    const partnerId = '1Y';
    const callback = null;
    const delay = null;
    let ad_div = addDiv('ad3');
    boost.addUnitById(partnerId, 'ad3', callback, delay);
    expect(boost.ads.length).to.equal(3);
    document.body.removeChild(ad_div);
  });

  it('test boost adUnitsByClassName', () => {
    const boost = window.top1.realvu_boost;
    const partnerId = '1Y';
    const callback = null;
    const delay = null;
    let ad_div = addDiv('ad4');
    ad_div.className = 'testClass';
    boost.addUnitsByClassName(partnerId, 'testClass', callback, delay);
    expect(boost.ads.length).to.equal(4);
    document.body.removeChild(ad_div);
  });

  it('test boost adUnit', () => {
    var boost = window.top1.realvu_boost;
    var ad_div = document.createElement('div');
    ad_div.id = 'ad5';
    document.body.appendChild(ad_div);
    var u = {
      partnerId: '1Y',
      unit: ad_div
    };
    boost.addUnit(u);
    expect(boost.ads.length).to.equal(5);
    document.body.removeChild(ad_div);
  });

  it('test boost getViewStatusById', () => {
    var boost = window.top1.realvu_boost;
    var ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    var u = {
      partnerId: '1Y',
      unit: ad_div
    };
    boost.addUnit(u);
    var vst = boost.getViewStatusById('ad1');
    expect(vst).to.equal('yes');
    document.body.removeChild(ad_div);
  });

  it('test boost exp', () => {
    var boost = window.top1.realvu_boost;
    var partnerId = '1Y';
    var ad_div = document.createElement('div');
    ad_div.id = 'ad7';
    ad_div.style = 'width:300px; height:250px;';
    document.body.appendChild(ad_div);
    boost.addUnitById(partnerId, 'ad7');
    var a = boost.ads[boost.ads.length - 1];
    a.frm = boost.newf(a, 300, 250);
    a.div.appendChild(a.frm);
    boost.exp(a);
    var t = a.frm.tagName;
    expect(t).to.equal('IFRAME');
    document.body.removeChild(ad_div);
  });

  it('test boost updateMem', () => {
    var boost = window.top1.realvu_boost;
    boost.updateMem('test1', 'test1Value');
    var valueTest1 = boost.getMem('test1');
    expect(valueTest1).to.equal('test1Value');
  });

  it('test boost writePos/readPos', () => {
    var boost = window.top1.realvu_boost;
    var a = {
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
    var torf = boost.readPos(a);
    expect(torf).to.equal(true);
  });

  it('test boost questA param is null', () => {
    var boost = window.top1.realvu_boost;
    var rtn = boost.questA(null);
    expect(rtn).to.equal(null);
  });

  it('test boost doc exception', () => {
    var boost = window.top1.realvu_boost;
    var rtn = boost.doc(null);
    expect(rtn).to.equal(null);
  });

  it('test boost setSize', () => {
    var boost = window.top1.realvu_boost;
    var a = [320, 50];
    var b = [970, 90];
    var c = [
      [320, 50]
    ];
    var d = [
      [970, 90]
    ];
    var rtn = boost.setSize(a);
    expect(rtn.w).to.equal(320);
    expect(rtn.h).to.equal(50);
    rtn = boost.setSize(b);
    expect(rtn.w).to.equal(970);
    expect(rtn.h).to.equal(90);
    rtn = boost.setSize('300x250');
    expect(rtn.w).to.equal(300);
    expect(rtn.h).to.equal(250);
    rtn = boost.setSize(c);
    expect(rtn.w).to.equal(320);
    expect(rtn.h).to.equal(50);
    rtn = boost.setSize(d);
    expect(rtn.w).to.equal(970);
    expect(rtn.h).to.equal(90);
    rtn = boost.setSize(null);
    expect(rtn).to.equal(null);
  });

  it('test boost brd', () => {
    var ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    var boost = window.top1.realvu_boost;
    var s = ad_div;
    var p = 'Left';
    var f = boost.brd(s, p);
    expect(f).to.be.greaterThan(-1);
    document.body.removeChild(ad_div);
  });
  /*
  it('test boost incrMem', () => {
    var boost = window.top1.realvu_boost;
    boost.ads = [{
      score: 10,
      pins: { unit_id: 'ad1', score: 10 }
    }, {
      score: 17,
      pins: { unit_id: 'ad2', score: 17 }
    }];

    boost.incrMem(0, 'r');
    expect(boost.ads[0].score).to.equal((boost.ads[0].score << 1) & 0xFFFFF);

    boost.incrMem(1, 'v');
    expect(boost.ads[1].score).to.equal((boost.ads[0].score |= 1) & 0xFFFFF);
  });

  */
  /*
  it('test track regAllUnits', () => {
    var boost = window.top1.realvu_boost;
    var partnerId = '1Y';
    var callback = null;
    var delay = null;
    var ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    var ad_div2 = document.createElement('div');
    ad_div2.id = 'ad2';
    document.body.appendChild(ad_div2);
    boost.addUnitById(partnerId, 'ad1', callback, delay);
    boost.addUnitById(partnerId, 'ad2', callback, delay);
    var ad_msg_div = document.createElement('div');
    ad_msg_div.id = 'msg_an';
    document.body.appendChild(ad_msg_div);
    var config = {
      options: {
        partnerId: '1Y',
        regAllUnits: true,
        unitIds: ['ad1', 'ad2']
      }
    };
    realvuAnalyticsAdapter.enableAnalytics(config);
    realvuAnalyticsAdapter.track({
      eventType: 'auctionInit',
      args: null
    });

    document.body.removeChild(ad_div);
    document.body.removeChild(ad_div2);
    document.body.removeChild(ad_msg_div);
  });
  */
});
