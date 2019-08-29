import {expect} from 'chai';
import * as utils from 'src/utils';
import * as sinon from 'sinon';

import {
  BIDDER_CODE,
  CATEGORY,
  CATEGORY_NAME,
  SSP_PLACEMENT_ID,
  END_POINT_URL,
  NQ,
  NQ_NAME,
  REF,
  spec,
  SUB_ID
} from '../../../modules/nanointeractiveBidAdapter';

describe('nanointeractive adapter tests', function () {
  const SIZES_PARAM = 'sizes';
  const BID_ID_PARAM = 'bidId';
  const BID_ID_VALUE = '24a1c9ec270973';
  const DATA_PARTNER_PIXEL_ID_VALUE = 'testPID';
  const NQ_VALUE = 'rumpelstiltskin';
  const NQ_NAME_QUERY_PARAM = 'nqName';
  const CATEGORY_VALUE = 'some category';
  const CATEGORY_NAME_QUERY_PARAM = 'catName';
  const SUB_ID_VALUE = '123';
  const REF_NO_VALUE = 'none';
  const REF_OTHER_VALUE = 'other';
  const WIDTH1 = 300;
  const HEIGHT1 = 250;
  const WIDTH2 = 468;
  const HEIGHT2 = 60;
  const SIZES_VALUE = [[WIDTH1, HEIGHT1], [WIDTH2, HEIGHT2]];
  const AD = '<script type="text/javascript" src="https://trc.audiencemanager.de/ad/?pl=58c2829beb0a193456047a27&cb=${CACHEBUSTER}&tc=${CLICK_URL_ENC}"></script> <noscript> <a href="https://trc.audiencemanager.de/ad/?t=c&pl=58c2829beb0a193456047a27&cb=${CACHEBUSTER}&tc=${CLICK_URL_ENC}"> <img src="https://trc.audiencemanager.de/ad/?t=i&pl=58c2829beb0a193456047a27&cb=${CACHEBUSTER}" alt="Click Here" border="0"> </a> </noscript>';
  const CPM = 1;

  function getBidRequest(params) {
    return {
      bidder: BIDDER_CODE,
      params: params,
      placementCode: 'div-gpt-ad-1460505748561-0',
      transactionId: 'ee335735-ddd3-41f2-b6c6-e8aa99f81c0f',
      [SIZES_PARAM]: SIZES_VALUE,
      [BID_ID_PARAM]: BID_ID_VALUE,
      bidderRequestId: '189135372acd55',
      auctionId: 'ac15bb68-4ef0-477f-93f4-de91c47f00a9'
    };
  }

  describe('NanoAdapter', function () {
    let nanoBidAdapter = spec;

    describe('Methods', function () {
      it('Test isBidRequestValid() with valid param(s): pid', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nq', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nq, category', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ,
          [CATEGORY]: CATEGORY_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nq, categoryName', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ,
          [CATEGORY_NAME_QUERY_PARAM]: CATEGORY_NAME_QUERY_PARAM,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nq, subId', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ,
          [SUB_ID]: SUB_ID_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nqName', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ_NAME]: NQ_NAME_QUERY_PARAM,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nqName, category', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ_NAME]: NQ_NAME_QUERY_PARAM,
          [CATEGORY]: CATEGORY_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nqName, categoryName', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ_NAME]: NQ_NAME_QUERY_PARAM,
          [CATEGORY_NAME_QUERY_PARAM]: CATEGORY_NAME_QUERY_PARAM,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nqName, subId', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ_NAME]: NQ_NAME_QUERY_PARAM,
          [SUB_ID]: SUB_ID_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, category', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [CATEGORY]: CATEGORY_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, category, subId', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [CATEGORY]: CATEGORY_VALUE,
          [SUB_ID]: SUB_ID_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, subId', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [SUB_ID]: SUB_ID_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nq, category, subId', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ_VALUE,
          [CATEGORY]: CATEGORY_VALUE,
          [SUB_ID]: SUB_ID_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nqName, categoryName, subId', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ_NAME]: NQ_NAME_QUERY_PARAM,
          [CATEGORY_NAME]: CATEGORY_NAME_QUERY_PARAM,
          [SUB_ID]: SUB_ID_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nq, category, subId, ref (value none)', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ_VALUE,
          [CATEGORY]: CATEGORY_VALUE,
          [SUB_ID]: SUB_ID_VALUE,
          [REF]: REF_NO_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nq, category, subId, ref (value other)', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ_VALUE,
          [CATEGORY]: CATEGORY_VALUE,
          [SUB_ID]: SUB_ID_VALUE,
          [REF]: REF_OTHER_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with invalid param(s): empty', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({}))).to.equal(false);
      });
      it('Test isBidRequestValid() with invalid param(s): pid missing', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [NQ]: NQ_VALUE,
          [CATEGORY]: CATEGORY_VALUE,
          [SUB_ID]: SUB_ID_VALUE,
        }))).to.equal(false);
      });

      let sandbox;

      function getMocks() {
        let mockOriginAddress = 'http://localhost';
        let mockRefAddress = 'http://some-ref.test';
        return {
          'windowLocationAddress': mockRefAddress,
          'originAddress': mockOriginAddress,
          'refAddress': '',
        };
      }

      function setUpMocks() {
        sinon.sandbox.restore();
        sandbox = sinon.sandbox.create();
        sandbox.stub(utils, 'getOrigin').callsFake(() => getMocks()['originAddress']);
        sandbox.stub(utils, 'deepAccess').callsFake(() => getMocks()['windowLocationAddress']);

        sandbox.stub(utils, 'getParameterByName').callsFake((arg) => {
          switch (arg) {
            case CATEGORY_NAME_QUERY_PARAM:
              return CATEGORY_VALUE;
            case NQ_NAME_QUERY_PARAM:
              return NQ_VALUE;
          }
        });
      }

      function assert(
        request,
        expectedPid,
        expectedNq,
        expectedCategory,
        expectedSubId
      ) {
        const requestData = JSON.parse(request.data);

        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(END_POINT_URL + '/hb');
        expect(requestData[0].pid).to.equal(expectedPid);
        expect(requestData[0].nq.toString()).to.equal(expectedNq.toString());
        expect(requestData[0].category.toString()).to.equal(expectedCategory.toString());
        expect(requestData[0].subId).to.equal(expectedSubId);
      }

      function tearDownMocks() {
        sandbox.restore();
      }

      it('Test buildRequest() - pid', function () {
        setUpMocks();
        let requestParams = {
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
        };
        let expectedPid = DATA_PARTNER_PIXEL_ID_VALUE;
        let expectedNq = [null];
        let expectedCategory = [null];
        let expectedSubId = null;

        let request = nanoBidAdapter.buildRequests([getBidRequest(requestParams)]);

        assert(request, expectedPid, expectedNq, expectedCategory, expectedSubId);
        tearDownMocks();
      });
      it('Test buildRequest() - pid, nq', function () {
        setUpMocks();
        let requestParams = {
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ_VALUE,
        };
        let expectedPid = DATA_PARTNER_PIXEL_ID_VALUE;
        let expectedNq = [NQ_VALUE];
        let expectedCategory = [null];
        let expectedSubId = null;

        let request = nanoBidAdapter.buildRequests([getBidRequest(requestParams)]);

        assert(request, expectedPid, expectedNq, expectedCategory, expectedSubId);
        tearDownMocks();
      });
      it('Test buildRequest() - pid, nq, category', function () {
        setUpMocks();
        let requestParams = {
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ_VALUE,
          [CATEGORY]: CATEGORY_VALUE,
        };
        let expectedPid = DATA_PARTNER_PIXEL_ID_VALUE;
        let expectedNq = [NQ_VALUE];
        let expectedCategory = [CATEGORY_VALUE];
        let expectedSubId = null;

        let request = nanoBidAdapter.buildRequests([getBidRequest(requestParams)]);

        assert(request, expectedPid, expectedNq, expectedCategory, expectedSubId);
        tearDownMocks();
      });
      it('Test buildRequest() - pid, nq, categoryName', function () {
        setUpMocks();

        let requestParams = {
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ_VALUE,
          [CATEGORY_NAME]: CATEGORY_NAME_QUERY_PARAM,
        };
        let expectedPid = DATA_PARTNER_PIXEL_ID_VALUE;
        let expectedNq = [NQ_VALUE];
        let expectedCategory = [CATEGORY_VALUE];
        let expectedSubId = null;

        let request = nanoBidAdapter.buildRequests([getBidRequest(requestParams)]);

        assert(request, expectedPid, expectedNq, expectedCategory, expectedSubId);
        tearDownMocks();
      });
      it('Test buildRequest() - pid, nq, subId', function () {
        setUpMocks();
        let requestParams = {
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ_VALUE,
          [SUB_ID]: SUB_ID_VALUE,
        };
        let expectedPid = DATA_PARTNER_PIXEL_ID_VALUE;
        let expectedNq = [NQ_VALUE];
        let expectedCategory = [null];
        let expectedSubId = SUB_ID_VALUE;

        let request = nanoBidAdapter.buildRequests([getBidRequest(requestParams)]);

        assert(request, expectedPid, expectedNq, expectedCategory, expectedSubId);
        tearDownMocks();
      });
      it('Test buildRequest() - pid, category', function () {
        setUpMocks();
        let requestParams = {
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [CATEGORY]: CATEGORY_VALUE,
        };
        let expectedPid = DATA_PARTNER_PIXEL_ID_VALUE;
        let expectedNq = [null];
        let expectedCategory = [CATEGORY_VALUE];
        let expectedSubId = null;

        let request = nanoBidAdapter.buildRequests([getBidRequest(requestParams)]);

        assert(request, expectedPid, expectedNq, expectedCategory, expectedSubId);
        tearDownMocks();
      });
      it('Test buildRequest() - pid, category, subId', function () {
        setUpMocks();
        let requestParams = {
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [CATEGORY]: CATEGORY_VALUE,
          [SUB_ID]: SUB_ID_VALUE,
        };
        let expectedPid = DATA_PARTNER_PIXEL_ID_VALUE;
        let expectedNq = [null];
        let expectedCategory = [CATEGORY_VALUE];
        let expectedSubId = SUB_ID_VALUE;

        let request = nanoBidAdapter.buildRequests([getBidRequest(requestParams)]);

        assert(request, expectedPid, expectedNq, expectedCategory, expectedSubId);
        tearDownMocks();
      });
      it('Test buildRequest() - pid, subId', function () {
        setUpMocks();
        let requestParams = {
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [SUB_ID]: SUB_ID_VALUE,
        };
        let expectedPid = DATA_PARTNER_PIXEL_ID_VALUE;
        let expectedNq = [null];
        let expectedCategory = [null];
        let expectedSubId = SUB_ID_VALUE;

        let request = nanoBidAdapter.buildRequests([getBidRequest(requestParams)]);

        assert(request, expectedPid, expectedNq, expectedCategory, expectedSubId);
        tearDownMocks();
      });
      it('Test buildRequest() - pid, nq, category, subId', function () {
        setUpMocks();
        let requestParams = {
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ_VALUE,
          [CATEGORY]: CATEGORY_VALUE,
          [SUB_ID]: SUB_ID_VALUE,
        };
        let expectedPid = DATA_PARTNER_PIXEL_ID_VALUE;
        let expectedNq = [NQ_VALUE];
        let expectedCategory = [CATEGORY_VALUE];
        let expectedSubId = SUB_ID_VALUE;

        let request = nanoBidAdapter.buildRequests([getBidRequest(requestParams)]);

        assert(request, expectedPid, expectedNq, expectedCategory, expectedSubId);
        tearDownMocks();
      });
      it('Test buildRequest() - pid, nqName, categoryName, subId', function () {
        setUpMocks();
        let requestParams = {
          [SSP_PLACEMENT_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ_NAME]: NQ_NAME_QUERY_PARAM,
          [CATEGORY_NAME]: CATEGORY_NAME_QUERY_PARAM,
          [SUB_ID]: SUB_ID_VALUE,
        };
        let expectedPid = DATA_PARTNER_PIXEL_ID_VALUE;
        let expectedNq = [NQ_VALUE];
        let expectedCategory = [CATEGORY_VALUE];
        let expectedSubId = SUB_ID_VALUE;

        let request = nanoBidAdapter.buildRequests([getBidRequest(requestParams)]);

        assert(request, expectedPid, expectedNq, expectedCategory, expectedSubId);
        tearDownMocks();
      });
      it('Test interpretResponse() length', function () {
        let bids = nanoBidAdapter.interpretResponse({
          body: [
            // valid
            {
              id: '24a1c9ec270973',
              cpm: CPM,
              width: WIDTH1,
              height: HEIGHT1,
              ad: AD,
              ttl: 360,
              creativeId: 'TEST_ID',
              netRevenue: false,
              currency: 'EUR',
            },
            // invalid
            {
              id: '24a1c9ec270973',
              cpm: null,
              width: WIDTH1,
              height: HEIGHT1,
              ad: AD,
              ttl: 360,
              creativeId: 'TEST_ID',
              netRevenue: false,
              currency: 'EUR',
            }
          ]
        });
        expect(bids.length).to.equal(1);
      });
      it('Test interpretResponse() bids', function () {
        let bid = nanoBidAdapter.interpretResponse({
          body: [
            // valid
            {
              id: '24a1c9ec270973',
              cpm: CPM,
              width: WIDTH1,
              height: HEIGHT1,
              ad: AD,
              ttl: 360,
              creativeId: 'TEST_ID',
              netRevenue: false,
              currency: 'EUR',
            },
            // invalid
            {
              id: '24a1c9ec270973',
              cpm: null,
              width: WIDTH1,
              height: HEIGHT1,
              ad: AD,
              ttl: 360,
              creativeId: 'TEST_ID',
              netRevenue: false,
              currency: 'EUR',
            }
          ]
        })[0];
        expect(bid.requestId).to.equal('24a1c9ec270973');
        expect(bid.cpm).to.equal(CPM);
        expect(bid.width).to.equal(WIDTH1);
        expect(bid.height).to.equal(HEIGHT1);
        expect(bid.ad).to.equal(AD);
        expect(bid.ttl).to.equal(360);
        expect(bid.creativeId).to.equal('TEST_ID');
        expect(bid.currency).to.equal('EUR');
      });
    });
  });
});
