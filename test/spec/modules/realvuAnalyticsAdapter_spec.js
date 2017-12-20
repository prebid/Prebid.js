// jshint esversion: 6
import {
  expect
} from 'chai';
import realvuAnalyticsAdapter from '../../../modules/realvuAnalyticsAdapter';
import CONSTANTS from 'src/constants.json';

describe('RealVu Analytics Adapter Test.', () => {
  it('checkIn returns "yes"', () => {
    let ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    let sizes = [
      [728, 90],
      [970, 250],
      [970, 90]
    ];
    let result = realvuAnalyticsAdapter.checkIn('ad1', sizes, '1Y');
    expect(result).to.equal('yes');
    document.body.removeChild(ad_div);
  });

  it('isInView returns "yes"', () => {
    let ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    let sizes = [
      [728, 90],
      [970, 250],
      [970, 90]
    ];
    realvuAnalyticsAdapter.checkIn('ad1', sizes, '1Y');
    let inview = realvuAnalyticsAdapter.isInView('ad1');
    expect(inview).to.equal('yes');
    document.body.removeChild(ad_div);
  });

  it('isInView return "NA"', () => {
    let placementCode = '1234';
    let result = realvuAnalyticsAdapter.isInView(placementCode);
    expect(result).to.equal('NA');
  });

  it('test enableAnalytics', () => {
    let boost = window.top1.realvu_boost;
    let config = {
      options: {
        partnerId: '1Y',
        regAllUnits: true,
        unitIds: ['ad1', 'ad2']
      }
    };
    let hb = $$PREBID_GLOBAL$$;
    let sz = [
      [728, 90],
      [970, 250],
      [970, 90]
    ];
    hb.adUnits = [{
      code: 'ad1',
      sizes: sz
    }, {
      code: 'ad2',
      sizes: sz
    }];
    let ad_div1 = document.createElement('div');
    ad_div1.id = 'ad1';
    document.body.appendChild(ad_div1);
    let ad_div2 = document.createElement('div');
    ad_div2.id = 'ad2';
    document.body.appendChild(ad_div2);

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
    let boost = window.top1.realvu_boost;
    let config = {
      options: {
        partnerId: '1Y',
        regAllUnits: false,
        unitIds: ['ad1', 'ad2']
      }
    };
    let hb = $$PREBID_GLOBAL$$;
    let sz = [
      [728, 90],
      [970, 250],
      [970, 90]
    ];
    hb.adUnits = [{
      code: 'ad1',
      sizes: sz
    }, {
      code: 'ad2',
      sizes: sz
    }];
    let ad_div1 = document.createElement('div');
    ad_div1.id = 'ad1';
    document.body.appendChild(ad_div1);
    let ad_div2 = document.createElement('div');
    ad_div2.id = 'ad2';
    document.body.appendChild(ad_div2);
    let ad_msg = document.createElement('div');
    ad_div2.id = 'msg_an';
    document.body.appendChild(ad_msg);

    config.options.regAllUnits = false;
    realvuAnalyticsAdapter.enableAnalytics(config);

    let options = realvuAnalyticsAdapter.getOptions();
    expect(options.regAllUnits).to.equal(false);
    expect(options.unitIds.length).to.equal(2);

    realvuAnalyticsAdapter.track({
      eventType: CONSTANTS.EVENTS.AUCTION_INIT,
      args: null
    });

    expect(boost.ads.length).to.equal(2);

    document.body.removeChild(ad_div1);
    document.body.removeChild(ad_div2);
    document.body.removeChild(ad_msg);
  });

  it('test boost adUnitById', () => {
    let boost = window.top1.realvu_boost;
    let partnerId = '1Y';
    let callback = null;
    let delay = null;
    let ad_div = document.createElement('div');
    ad_div.id = 'ad3';
    document.body.appendChild(ad_div);
    boost.addUnitById(partnerId, 'ad3', callback, delay);
    expect(boost.ads.length).to.equal(3);
    document.body.removeChild(ad_div);
  });

  it('test boost adUnitsByClassName', () => {
    let boost = window.top1.realvu_boost;
    let partnerId = '1Y';
    let callback = null;
    let delay = null;
    let ad_div = document.createElement('div');
    ad_div.id = 'ad4';
    ad_div.className = 'testClass';
    document.body.appendChild(ad_div);
    boost.addUnitsByClassName(partnerId, 'testClass', callback, delay);
    expect(boost.ads.length).to.equal(4);
    document.body.removeChild(ad_div);
  });

  it('test boost adUnit', () => {
    let boost = window.top1.realvu_boost;
    let ad_div = document.createElement('div');
    ad_div.id = 'ad5';
    document.body.appendChild(ad_div);
    let u = {
      partnerId: '1Y',
      unit: ad_div
    };
    boost.addUnit(u);
    expect(boost.ads.length).to.equal(5);
    document.body.removeChild(ad_div);
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

  it('test boost doc exception', () => {
    let boost = window.top1.realvu_boost;
    let rtn = boost.doc(null);
    expect(rtn).to.equal(null);
  });

  it('test boost setSize', () => {
    let boost = window.top1.realvu_boost;
    let a = [320, 50];
    let b = [970, 90];
    let c = [
      [320, 50]
    ];
    let d = [
      [970, 90]
    ];
    let rtn = boost.setSize(a);
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
