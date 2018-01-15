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
  dv.style.border = '10px';
  let f = document.createElement('iframe');
  f.id = id + 'f';
  f.width = 300;
  f.height = 250;
  f.frameborder = 1;
  f.style.borderWidth = '4px';
  dv.appendChild(f);
  let d = null;
  if (f.contentDocument) d = f.contentDocument; // DOM
  else if (f.contentWindow) d = f.contentWindow.document; // IE
  d.open();
  let s1 = '<body style="margin:0px;">';
  if (id === 'ad1') {
    s1 += '<img width="300" height="250" />';
  } else {
    s1 += '<div>AD TEXT</div>';
  }
  s1 += '</body>';
  d.write(s1);
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
        regAllUnits: true,
        unitIds: ['ad1', 'ad2']
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

    result = realvuAnalyticsAdapter.checkIn(bid); // test invalid partnerId 'undefined'
    result = realvuAnalyticsAdapter.checkIn(bid, ''); // test invalid partnerId ''
  });

  it('isInView returns "yes"', () => {
    let inview = realvuAnalyticsAdapter.isInView('ad1');
    expect(inview).to.equal('yes');
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
    const boost = window.top1.realvu_aa;
    expect(boost.ads[0].bids.length).to.equal(1);

    realvuAnalyticsAdapter.track({
      eventType: CONSTANTS.EVENTS.BID_WON,
      args: args
    });
    expect(boost.ads[0].bids[0].winner).to.equal(1);
  });
});

describe('RealVu Boost.', () => {
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

  const boost = window.top1.realvu_aa;

  it('brd', () => {
    let a1 = document.getElementById('ad1f');
    let p = boost.brd(a1, 'Left');
    expect(p).to.equal(4);
  });

  it('addUnitById', () => {
    let p = boost.addUnitById('1Y', 'ad1');
    expect(p).to.equal('yes');
  });

  it('addUnitById', () => {
    let p = boost.addUnitById('1Y', 'no_ad');
    console.log('p='+p);
    expect(p).to.be.undefined;
  });

  it('questA IMG', () => {
    const dv = document.getElementById('ad1');
    let q = boost.questA(dv);
    expect(q.tagName).to.equal('IMG');
  });

  it('questA text', () => {
    const dv = document.getElementById('ad2');
    let q = boost.questA(dv);
    expect(q.tagName).to.equal('BODY');
  });

  it('find position', () => {
    let dv = document.getElementById('ad2');
    dv.getBoundingClientRect = false;
    let q = boost.findPosG(dv);
    // console.log('render: ' + q.x + ', ' + q.y);
    expect(q.x).to.be.above(0);
    expect(q.y).to.be.above(300);
  });

  it('readPos', () => {
    const a = boost.ads[0];
    let r = boost.readPos(a);
    expect(r).to.equal(true);
  });
});
