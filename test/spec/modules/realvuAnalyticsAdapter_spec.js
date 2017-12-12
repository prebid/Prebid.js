// jshint esversion: 6
import {
    expect
} from 'chai';
import bidmanager from '../../../src/bidmanager';
import adloader from '../../../src/adloader';
import realvuAnalyticsAdapter from '../../../modules/realvuAnalyticsAdapter'
let constants = require('../../../src/constants.json');

describe('RealVu Analytics Adapter Test.', () => {
    var adloaderStub;

    beforeEach(function() {
        adloaderStub = sinon.stub(adloader, 'loadScript');
    });

    afterEach(function() {
        adloader.loadScript.restore();
    });

    it('inView returns "yes"', () => {
        var ad_div = document.createElement('div');
        ad_div.id = 'ad1';
        document.body.appendChild(ad_div);
        var sizes = [
            [728, 90],
            [970, 250],
            [970, 90]
        ];

        var result = realvuAnalyticsAdapter.checkIn('ad1', sizes, '1Y');
        // console.log('a.box='+JSON.stringify(window.top1.realvu_boost.ads[0].box));
        expect(result).to.equal('yes');
        document.body.removeChild(ad_div);
    });

    it('isInView returns "yes"', () => {
        var ad_div = document.createElement('div');
        ad_div.id = 'ad1';
        document.body.appendChild(ad_div);
        var sizes = [
            [728, 90],
            [970, 250],
            [970, 90]
        ];
        var result = realvuAnalyticsAdapter.checkIn('ad1', sizes, '1Y');
        var inview = realvuAnalyticsAdapter.isInView('ad1');
        // console.log('a.box='+JSON.stringify(window.top1.realvu_boost.ads[0].box));
        expect(inview).to.equal('yes');
        document.body.removeChild(ad_div);
    });

    it('isInView return "NA"', () => {
        var placementCode = '1234';
        var result = realvuAnalyticsAdapter.isInView(placementCode);
        expect(result).to.equal('NA');
    });

    it('test enableAnalytics', () => {
        var config = {
            options: {
                partner_id: '1Y',
                all_in: true,
                unit_ids: ['ad1', 'ad2']
            }
        };
        var ad_div = document.createElement('div');
        ad_div.id = 'msg_an';
        document.body.appendChild(ad_div);
        realvuAnalyticsAdapter.enableAnalytics(config);
        expect(config.options.all_in).to.equal(true);
        document.body.removeChild(ad_div);
    });

    it('test boost adUnitById', () => {
        var boost = window.top1.realvu_boost;
        var partner_id = '1Y';
        var unit_id = 'ad1';
        var callback = null;
        var delay = null;
        var ad_div = document.createElement('div');
        ad_div.id = 'ad1';
        document.body.appendChild(ad_div);
        var sizes = [
            [728, 90],
            [970, 250],
            [970, 90]
        ];
        boost.addUnitById(partner_id, unit_id, callback, delay);
        document.body.removeChild(ad_div);
    });

    it('test boost adUnitsByClassName', () => {
        var boost = window.top1.realvu_boost;
        var partner_id = '1Y';
        var unit_id = 'ad1';
        var callback = null;
        var delay = null;
        var ad_div = document.createElement('div');
        ad_div.id = 'ad1';
        ad_div.className = 'testClass';
        document.body.appendChild(ad_div);
        var sizes = [
            [728, 90],
            [970, 250],
            [970, 90]
        ];
        boost.addUnitsByClassName(partner_id, 'testClass', callback, delay);
        document.body.removeChild(ad_div);
    });

    it('test boost adUnit', () => {
        var boost = window.top1.realvu_boost;
        var partner_id = '1Y';
        var unit_id = 'ad1';
        var callback = null;
        var delay = null;
        var ad_div = document.createElement('div');
        ad_div.id = 'ad1';
        ad_div.className = 'testClass';
        document.body.appendChild(ad_div);
        var sizes = [
            [728, 90],
            [970, 250],
            [970, 90]
        ];
        var u = {};
        boost.addUnit(u);
        document.body.removeChild(ad_div);
    });

    it('test boost getViewStatusById', () => {
        var boost = window.top1.realvu_boost;
        var partner_id = '1Y';
        var unit_id = 'ad1';
        var callback = null;
        var delay = null;
        var ad_div = document.createElement('div');
        ad_div.id = 'ad1';
        ad_div.className = 'testClass';
        document.body.appendChild(ad_div);
        var sizes = [
            [728, 90],
            [970, 250],
            [970, 90]
        ];
        var u = {};
        boost.getViewStatusById(unit_id);
        document.body.removeChild(ad_div);
    });

    it('test boost exp', () => {
        var boost = window.top1.realvu_boost;
        var partner_id = '1Y';
        var unit_id = 'ad1';
        var callback = null;
        var delay = null;
        var ad_div = document.createElement('div');
        ad_div.id = 'ad1';
        document.body.appendChild(ad_div);
        var sizes = [
            [728, 90],
            [970, 250],
            [970, 90]
        ];
        boost.addUnitById(partner_id, unit_id, callback, delay);

        var a = boost;
        var w = 728;
        var h = 90;
        a.wnd = window;
        a.frm = boost.newf(boost, w, h);
        a.frm.height = 90;
        a.frm.width = 728;
        a.ads[a.num] = a;
        a.div = ad_div;
        a.div.appendChild(a.frm);
        var e = boost.exp(a);
        var t = typeof document.div;
        expect(t).to.equal('undefined');
        document.body.removeChild(ad_div);
    });

    it('test boost brd', () => {
        var ad_div = document.createElement('div');
        ad_div.id = 'ad1';
        document.body.appendChild(ad_div);
        var boost = window.top1.realvu_boost;
        var a = {
            wnd: window
        };
        var w = 728;
        var h = 90;
        var s = ad_div;
        var p = 'Left';
        var f = boost.brd(s, p);
        expect(f).to.be.greaterThan(-1);
        document.body.removeChild(ad_div);
    });

    it('test track all_in', () => {
        var boost = window.top1.realvu_boost;
        var partner_id = '1Y';
        var unit_id = 'ad1';
        var callback = null;
        var delay = null;
        var ad_div = document.createElement('div');
        ad_div.id = 'ad1';
        document.body.appendChild(ad_div);
        var ad_div2 = document.createElement('div');
        ad_div2.id = 'ad2';
        document.body.appendChild(ad_div2);
        var sizes = [
            [728, 90],
            [970, 250],
            [970, 90]
        ];
        boost.addUnitById(partner_id, 'ad1', callback, delay);
        boost.addUnitById(partner_id, 'ad2', callback, delay);
        var ad_msg_div = document.createElement('div');
        ad_msg_div.id = 'msg_an';
        document.body.appendChild(ad_msg_div);
        var config = {
            options: {
                partner_id: '1Y',
                all_in: true,
                unit_ids: ['ad1', 'ad2']
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
});