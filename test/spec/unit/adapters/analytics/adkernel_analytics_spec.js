import adkernelAdapter from 'src/adapters/analytics/adkernel';
import CONSTANTS from 'src/constants.json';

const GLOBAL_NAME = 'aka2';

const BID_REQUEST = {
    "bidderCode": "adkernel",
    "requestId": "436f749c-2ec5-43f4-bda5-1b188ccfe0e6",
    "bidderRequestId": "157700dbd363c",
    "bids": [{
        "bidder": "adkernel",
        "params": {
            "zoneId": "15417",
            "host": "rtb.nativeads.com"
        },
        "placementCode": "container-1",
        "sizes": [
            [300, 250]
        ],
        "bidId": "27c19b50b1b96c",
        "bidderRequestId": "157700dbd363c",
        "requestId": "436f749c-2ec5-43f4-bda5-1b188ccfe0e6"
    }, {
        "bidder": "adkernel",
        "params": {
            "zoneId": "30164",
            "host": "cpm.metaadserving.com"
        },
        "placementCode": "container-1",
        "sizes": [
            [300, 250]
        ],
        "bidId": "3fc70d832ac89",
        "bidderRequestId": "157700dbd363c",
        "requestId": "436f749c-2ec5-43f4-bda5-1b188ccfe0e6"
    }, {
        "bidder": "foobar",
        "params": {},
        "placementCode": "container-1",
        "sizes": [
            [300, 250]
        ],
        "bidId": "98ca238d07cf3",
        "bidderRequestId": "157700dbd363c",
        "requestId": "436f749c-2ec5-43f4-bda5-1b188ccfe0e6"
    }],
    "start": 1487176969100,
    "auctionStart": 1487176969095,
    "timeout": 3000
};
const BID_RESPONSE_1 = {
    "bidderCode": "adkernel",
    "width": 300,
    "height": 250,
    "statusMessage": "Bid available",
    "adId": "27c19b50b1b96c",
    "ad": "<a href=\"http://rtb.nativeads.com/click?adid=1299518&i=Ks55ghBsSvk_0\" target=\"_blank\"><img src=\"http://akcdn.nativeadsfeed.com/n284/ad/300x250_eEGYXldD.png\" width=\"300\" height=\"250\" border=\"0\" ></a><img src='http://rtb.nativeads.com/pixel?i=Ks55ghBsSvk_0' alt=' ' style='display:none'><div style=\"position:absolute;left:0px;top:0px;visibility:hidden;\"><img src=\"http://rtb.nativeads.com/win?i=Ks55ghBsSvk_0\"></div>",
    "cpm": 95,
    "requestId": "436f749c-2ec5-43f4-bda5-1b188ccfe0e6",
    "responseTimestamp": 1487176969400,
    "requestTimestamp": 1487176969100,
    "bidder": "adkernel",
    "adUnitCode": "container-1",
    "timeToRespond": 300
};
const BID_RESPONSE_2 = {
    "bidderCode": "adkernel",
    "width": 300,
    "height": 250,
    "statusMessage": "Bid available",
    "adId": "3fc70d832ac89",
    "ad": "<a href='http://example.com'>\n<img width='300' height='250' src='http://www.svpmeds.com/wp-content/themes/svpmeds/images/test_banner_300_250.png'>\n</a><img src='http://cpm.metaadserving.com/imp?i=juUNH23uLmo_0' alt=' ' style='display:none'><div style=\"position:absolute;left:0px;top:0px;visibility:hidden;\"><img src=\"http://cpm.metaadserving.com/win?i=juUNH23uLmo_0\"></div>",
    "cpm": 0.015,
    "requestId": "436f749c-2ec5-43f4-bda5-1b188ccfe0e6",
    "responseTimestamp": 1487176969377,
    "requestTimestamp": 1487176969100,
    "bidder": "adkernel",
    "adUnitCode": "container-1",
    "timeToRespond": 277
};
const BID_WON = {
    "bidderCode": "adkernel",
    "width": 300,
    "height": 250,
    "statusMessage": "Bid available",
    "adId": "27c19b50b1b96c",
    "ad": "<a href=\"http://rtb.nativeads.com/click?adid=1299518&i=Ks55ghBsSvk_0\" target=\"_blank\"><img src=\"http://akcdn.nativeadsfeed.com/n284/ad/300x250_eEGYXldD.png\" width=\"300\" height=\"250\" border=\"0\" ></a><img src='http://rtb.nativeads.com/pixel?i=Ks55ghBsSvk_0' alt=' ' style='display:none'><div style=\"position:absolute;left:0px;top:0px;visibility:hidden;\"><img src=\"http://rtb.nativeads.com/win?i=Ks55ghBsSvk_0\"></div>",
    "cpm": 95,
    "requestId": "436f749c-2ec5-43f4-bda5-1b188ccfe0e6",
    "responseTimestamp": 1487176969400,
    "requestTimestamp": 1487176969100,
    "bidder": "adkernel",
    "adUnitCode": "container-1",
    "timeToRespond": 300,
    "pbLg": "5.00",
    "pbMg": "20.00",
    "pbHg": "20.00",
    "pbAg": "20.00",
    "pbDg": "20.00",
    "pbCg": "",
    "size": "300x250",
    "adserverTargeting": {
        "hb_bidder": "adkernel",
        "hb_adid": "27c19b50b1b96c",
        "hb_pb": "20.00",
        "hb_size": "300x250"
    }
};

describe('adkernel analytics adapter should', () => {
    let sandbox;
    let aka;

    adkernelAdapter.enableAnalytics();

    beforeEach(() =>{
        sandbox = sinon.sandbox.create();
        aka = sandbox.spy();
        window[GLOBAL_NAME] = aka;
    });

    afterEach(() => {
        delete window[GLOBAL_NAME];
        sandbox.restore();
    });

    it('should use new global name', () => {
        adkernelAdapter.track({eventType : CONSTANTS.EVENTS.AUCTION_INIT, args : { config : { globalName : GLOBAL_NAME } }});
        expect(adkernelAdapter.getGlobal()).to.be.equal(GLOBAL_NAME);

    });

    it('send events for each bid request', () => {
        adkernelAdapter.track({eventType : CONSTANTS.EVENTS.BID_REQUESTED, args : BID_REQUEST});
        expect(aka.firstCall.args).to.be.eql(['send', 'event', 'pb_adkernel_15417_Requests']);
        expect(aka.secondCall.args).to.be.eql(['send', 'event', 'pb_adkernel_30164_Requests']);
    });

    it('send events for first bid response', () => {
        adkernelAdapter.track({eventType : CONSTANTS.EVENTS.BID_RESPONSE, args : BID_RESPONSE_1});
        expect(aka.getCall(0).args).to.be.eql(['send', 'event', 'pb_adkernel_15417_BidLoad', 0.3]);
        expect(aka.getCall(1).args).to.be.eql(['send', 'event', 'pb_adkernel_15417_BidLoadBucket0300-0400ms', 0.3]);
        expect(aka.getCall(2).args).to.be.eql(['send', 'event', 'pb_adkernel_15417_BidCpm', 95]);
        expect(aka.getCall(3).args).to.be.eql(['send', 'event', 'pb_adkernel_15417_BidCpmBucket>$8', 95]);
    });

    it('send events for second bid response', () => {
        adkernelAdapter.track({eventType : CONSTANTS.EVENTS.BID_RESPONSE, args : BID_RESPONSE_2});
        expect(aka.getCall(0).args).to.be.eql(['send', 'event', 'pb_adkernel_30164_BidLoad', 0.277]);
        expect(aka.getCall(1).args).to.be.eql(['send', 'event', 'pb_adkernel_30164_BidLoadBucket0200-0300ms', 0.277]);
        expect(aka.getCall(2).args).to.be.eql(['send', 'event', 'pb_adkernel_30164_BidCpm', 0.015]);
        expect(aka.getCall(3).args).to.be.eql(['send', 'event', 'pb_adkernel_30164_BidCpmBucket$0-0.5', 0.015]);
    });

    it ('send event for timed out adapter', () => {
        adkernelAdapter.track({eventType : CONSTANTS.EVENTS.BID_TIMEOUT, args : ['foobar']});
        expect(aka.getCall(0).args).to.be.eql(['send', 'event', 'pb_foobar_0_Timeout']);
    });

    it('send events for bid won', () => {
        adkernelAdapter.track({eventType : CONSTANTS.EVENTS.BID_WON, args : BID_WON});
        expect(aka.getCall(0).args).to.be.eql(['send', 'event', 'pb_adkernel_15417_WonCpm', 95]);
        expect(aka.getCall(1).args).to.be.eql(['send', 'event', 'pb_adkernel_15417_WonCpmBucket>$8', 95]);
    });
});