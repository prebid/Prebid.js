// jshint esversion: 6
import {expect} from 'chai';
import realvuAnalyticsAdapter from '../../../modules/realvuAnalyticsAdapter';
import CONSTANTS from 'src/constants.json';

function addDiv(id) {
  let dv = document.createElement('div');
  dv.id = id;
  dv.style.width = '728px';
  dv.style.height = '90px';
  dv.style.display = 'block';
  document.body.appendChild(dv);
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

  it('checkIn returns "yes"', () => {
    const bid = {placementCode: 'ad1', sizes: [[728, 90], [970, 250], [970, 90]]};
    let result = realvuAnalyticsAdapter.checkIn(bid, '1Y');
    const b = window.top1.realvu_boost;
    let a = b.ads[0];
    // console.log('a: ' + a.x + ', ' + a.y + ', ' + a.w + ', ' + a.h);
    // console.log('b: ' + b.x1 + ', ' + b.y1 + ', ' + b.x2 + ', ' + b.y2);
    expect(result).to.equal('yes');
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
    const boost = window.top1.realvu_boost;
    expect(boost.ads[0].bids.length).to.equal(1);
  });
});
