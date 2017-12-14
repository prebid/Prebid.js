// jshint esversion: 6
import {expect} from 'chai';
import realvuAnalyticsAdapter from '../../../modules/realvuAnalyticsAdapter';
import CONSTANTS from 'src/constants.json';

describe('RealVu Analytics Adapter Test.', () => {
  it('checkIn returns "yes"', () => {
    var ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    var sizes = [[728, 90], [970, 250], [970, 90]];
    var result = realvuAnalyticsAdapter.checkIn('ad1', sizes, '1Y');
    expect(result).to.equal('yes');
    document.body.removeChild(ad_div);
  });

  it('isInView returns "yes"', () => {
    var ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    var sizes = [[728, 90], [970, 250], [970, 90]];
    realvuAnalyticsAdapter.checkIn('ad1', sizes, '1Y');
    var inview = realvuAnalyticsAdapter.isInView('ad1');
    expect(inview).to.equal('yes');
    document.body.removeChild(ad_div);
  });

  it('isInView return "NA"', () => {
    var placementCode = '1234';
    var result = realvuAnalyticsAdapter.isInView(placementCode);
    expect(result).to.equal('NA');
  });

  it('test enableAnalytics', () => {
    var boost = window.top1.realvu_boost;
    var config = {
      options: {
        partnerId: '1Y',
        allIn: true,
        unitIds: ['ad1', 'ad2']
      }
    };
    var hb = $$PREBID_GLOBAL$$;
    var sz = [[728, 90], [970, 250], [970, 90]];
    hb.adUnits = [{code: 'ad1', sizes: sz}, {code: 'ad2', sizes: sz}];
    var ad_div1 = document.createElement('div');
    ad_div1.id = 'ad1';
    document.body.appendChild(ad_div1);
    var ad_div2 = document.createElement('div');
    ad_div2.id = 'ad2';
    document.body.appendChild(ad_div2);

    realvuAnalyticsAdapter.enableAnalytics(config);
    realvuAnalyticsAdapter.track({eventType: CONSTANTS.EVENTS.AUCTION_INIT, args: null});

    expect(boost.ads.length).to.equal(2);
    document.body.removeChild(ad_div1);
    document.body.removeChild(ad_div2);
  });

  it('test boost adUnitById', () => {
    var boost = window.top1.realvu_boost;
    var partnerId = '1Y';
    var callback = null;
    var delay = null;
    var ad_div = document.createElement('div');
    ad_div.id = 'ad3';
    document.body.appendChild(ad_div);
    boost.addUnitById(partnerId, 'ad3', callback, delay);
    expect(boost.ads.length).to.equal(3);
    document.body.removeChild(ad_div);
  });

  it('test boost adUnitsByClassName', () => {
    var boost = window.top1.realvu_boost;
    var partnerId = '1Y';
    var callback = null;
    var delay = null;
    var ad_div = document.createElement('div');
    ad_div.id = 'ad4';
    ad_div.className = 'testClass';
    document.body.appendChild(ad_div);
    boost.addUnitsByClassName(partnerId, 'testClass', callback, delay);
    expect(boost.ads.length).to.equal(4);
    document.body.removeChild(ad_div);
  });

  it('test boost adUnit', () => {
    var boost = window.top1.realvu_boost;
    var ad_div = document.createElement('div');
    ad_div.id = 'ad5';
    document.body.appendChild(ad_div);
    var u = {partnerId: '1Y', unit: ad_div};
    boost.addUnit(u);
    expect(boost.ads.length).to.equal(5);
    document.body.removeChild(ad_div);
  });

  it('test boost getViewStatusById', () => {
    var boost = window.top1.realvu_boost;
    var ad_div = document.createElement('div');
    ad_div.id = 'ad1';
    document.body.appendChild(ad_div);
    var u = {partnerId: '1Y', unit: ad_div};
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

  /*
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
  */
  /*
  it('test track allIn', () => {
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
        allIn: true,
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
