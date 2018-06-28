import { expect } from 'chai';
import * as utils from 'src/utils';
import * as sinon from 'sinon';

import {
  BIDDER_CODE,
  CATEGORY,
  CATEGORY_NAME,
  DATA_PARTNER_PIXEL_ID,
  ENGINE_BASE_URL,
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
  const CORS_PARAM = 'cors';
  const DATA_PARTNER_PIXEL_ID_VALUE = 'pid1';
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

  function getBidResponse (pid, nq, category, subId, cors, ref) {
    return {
      [DATA_PARTNER_PIXEL_ID]: pid,
      [NQ]: nq,
      [CATEGORY]: category,
      [SUB_ID]: subId,
      [REF]: ref,
      [SIZES_PARAM]: [WIDTH1 + 'x' + HEIGHT1, WIDTH2 + 'x' + HEIGHT2],
      [BID_ID_PARAM]: BID_ID_VALUE,
      [CORS_PARAM]: cors,
    };
  }
  function getBidRequest (params) {
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

  describe('NanoAdapter', () => {
    let nanoBidAdapter = spec;

    describe('Methods', () => {
      it('Test isBidRequestValid() with valid param(s): pid', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nq', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nq, category', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ,
          [CATEGORY]: CATEGORY_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nq, categoryName', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ,
          [CATEGORY_NAME_QUERY_PARAM]: CATEGORY_NAME_QUERY_PARAM,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nq, subId', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ,
          [SUB_ID]: SUB_ID_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nqName', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ_NAME]: NQ_NAME_QUERY_PARAM,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nqName, category', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ_NAME]: NQ_NAME_QUERY_PARAM,
          [CATEGORY]: CATEGORY_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nqName, categoryName', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ_NAME]: NQ_NAME_QUERY_PARAM,
          [CATEGORY_NAME_QUERY_PARAM]: CATEGORY_NAME_QUERY_PARAM,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nqName, subId', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ_NAME]: NQ_NAME_QUERY_PARAM,
          [SUB_ID]: SUB_ID_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, category', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [CATEGORY]: CATEGORY_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, category, subId', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [CATEGORY]: CATEGORY_VALUE,
          [SUB_ID]: SUB_ID_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, subId', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [SUB_ID]: SUB_ID_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nq, category, subId', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ_VALUE,
          [CATEGORY]: CATEGORY_VALUE,
          [SUB_ID]: SUB_ID_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nqName, categoryName, subId', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ_NAME]: NQ_NAME_QUERY_PARAM,
          [CATEGORY_NAME]: CATEGORY_NAME_QUERY_PARAM,
          [SUB_ID]: SUB_ID_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nq, category, subId, ref (value none)', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
          [NQ]: NQ_VALUE,
          [CATEGORY]: CATEGORY_VALUE,
          [SUB_ID]: SUB_ID_VALUE,
          [REF]: REF_NO_VALUE,
        }))).to.equal(true);
      });
      it('Test isBidRequestValid() with valid param(s): pid, nq, category, subId, ref (value other)', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBidRequest({
          [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
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
      it('Test buildRequest() - pid', function () {
        let mockOriginAddress = 'http://localhost';
        let mockRefAddress = 'http://some-ref.test';
        let sandbox = sinon.sandbox.create();
        sandbox.stub(utils, 'getOrigin').callsFake(() => mockOriginAddress);
        sandbox.stub(utils, 'getTopWindowReferrer').callsFake(() => mockRefAddress);
        sandbox.stub(utils, 'getParameterByName').callsFake((arg) => {
          switch (arg) {
            case CATEGORY_NAME_QUERY_PARAM:
              return CATEGORY_VALUE;
            case NQ_NAME_QUERY_PARAM:
              return NQ_VALUE;
          }
        });
        let testInput =
          {
            requestParams: {
              [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
            },
            expectedPid: DATA_PARTNER_PIXEL_ID_VALUE,
            expectedNq: [null],
            expectedCategory: [null],
            expectedSubId: null,
            expectedCors: mockOriginAddress,
            expectedRef: mockRefAddress,
          };
        let request = nanoBidAdapter.buildRequests([
          getBidRequest(testInput.requestParams)]);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENGINE_BASE_URL);
        expect(request.data).to.equal(JSON.stringify([
          getBidResponse(
            testInput.expectedPid,
            testInput.expectedNq,
            testInput.expectedCategory,
            testInput.expectedSubId,
            testInput.expectedCors,
            testInput.expectedRef
          ),
        ]));
        sandbox.restore();
      });
      it('Test buildRequest() - pid, nq', function () {
        let mockOriginAddress = 'http://localhost';
        let mockRefAddress = 'http://some-ref.test';
        let sandbox = sinon.sandbox.create();
        sandbox.stub(utils, 'getOrigin').callsFake(() => mockOriginAddress);
        sandbox.stub(utils, 'getTopWindowReferrer').callsFake(() => mockRefAddress);
        sandbox.stub(utils, 'getParameterByName').callsFake((arg) => {
          switch (arg) {
            case CATEGORY_NAME_QUERY_PARAM:
              return CATEGORY_VALUE;
            case NQ_NAME_QUERY_PARAM:
              return NQ_VALUE;
          }
        });
        let testInput =
          {
            requestParams: {
              [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
              [NQ]: NQ_VALUE,
            },
            expectedPid: DATA_PARTNER_PIXEL_ID_VALUE,
            expectedNq: [NQ_VALUE],
            expectedCategory: [null],
            expectedSubId: null,
            expectedCors: mockOriginAddress,
            expectedRef: mockRefAddress,
          };
        let request = nanoBidAdapter.buildRequests([
          getBidRequest(testInput.requestParams)]);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENGINE_BASE_URL);
        expect(request.data).to.equal(JSON.stringify([
          getBidResponse(
            testInput.expectedPid,
            testInput.expectedNq,
            testInput.expectedCategory,
            testInput.expectedSubId,
            testInput.expectedCors,
            testInput.expectedRef
          ),
        ]));
        sandbox.restore();
      });
      it('Test buildRequest() - pid, nq, category', function () {
        let mockOriginAddress = 'http://localhost';
        let mockRefAddress = 'http://some-ref.test';
        let sandbox = sinon.sandbox.create();
        sandbox.stub(utils, 'getOrigin').callsFake(() => mockOriginAddress);
        sandbox.stub(utils, 'getTopWindowReferrer').callsFake(() => mockRefAddress);
        sandbox.stub(utils, 'getParameterByName').callsFake((arg) => {
          switch (arg) {
            case CATEGORY_NAME_QUERY_PARAM:
              return CATEGORY_VALUE;
            case NQ_NAME_QUERY_PARAM:
              return NQ_VALUE;
          }
        });
        let testInput =
          {
            requestParams: {
              [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
              [NQ]: NQ_VALUE,
              [CATEGORY]: CATEGORY_VALUE,
            },
            expectedPid: DATA_PARTNER_PIXEL_ID_VALUE,
            expectedNq: [NQ_VALUE],
            expectedCategory: [CATEGORY_VALUE],
            expectedSubId: null,
            expectedCors: mockOriginAddress,
            expectedRef: mockRefAddress,
          };
        let request = nanoBidAdapter.buildRequests([
          getBidRequest(testInput.requestParams)]);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENGINE_BASE_URL);
        expect(request.data).to.equal(JSON.stringify([
          getBidResponse(
            testInput.expectedPid,
            testInput.expectedNq,
            testInput.expectedCategory,
            testInput.expectedSubId,
            testInput.expectedCors,
            testInput.expectedRef
          ),
        ]));
        sandbox.restore();
      });
      it('Test buildRequest() - pid, nq, categoryName', function () {
        let mockOriginAddress = 'http://localhost';
        let mockRefAddress = 'http://some-ref.test';
        let sandbox = sinon.sandbox.create();
        sandbox.stub(utils, 'getOrigin').callsFake(() => mockOriginAddress);
        sandbox.stub(utils, 'getTopWindowReferrer').callsFake(() => mockRefAddress);
        sandbox.stub(utils, 'getParameterByName').callsFake((arg) => {
          switch (arg) {
            case CATEGORY_NAME_QUERY_PARAM:
              return CATEGORY_VALUE;
            case NQ_NAME_QUERY_PARAM:
              return NQ_VALUE;
          }
        });
        let testInput =
          {
            requestParams: {
              [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
              [NQ]: NQ_VALUE,
              [CATEGORY_NAME]: CATEGORY_NAME_QUERY_PARAM,
            },
            expectedPid: DATA_PARTNER_PIXEL_ID_VALUE,
            expectedNq: [NQ_VALUE],
            expectedCategory: [CATEGORY_VALUE],
            expectedSubId: null,
            expectedCors: mockOriginAddress,
            expectedRef: mockRefAddress,
          };
        let request = nanoBidAdapter.buildRequests([
          getBidRequest(testInput.requestParams)]);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENGINE_BASE_URL);
        expect(request.data).to.equal(JSON.stringify([
          getBidResponse(
            testInput.expectedPid,
            testInput.expectedNq,
            testInput.expectedCategory,
            testInput.expectedSubId,
            testInput.expectedCors,
            testInput.expectedRef
          ),
        ]));
        sandbox.restore();
      });
      it('Test buildRequest() - pid, nq, subId', function () {
        let mockOriginAddress = 'http://localhost';
        let mockRefAddress = 'http://some-ref.test';
        let sandbox = sinon.sandbox.create();
        sandbox.stub(utils, 'getOrigin').callsFake(() => mockOriginAddress);
        sandbox.stub(utils, 'getTopWindowReferrer').callsFake(() => mockRefAddress);
        sandbox.stub(utils, 'getParameterByName').callsFake((arg) => {
          switch (arg) {
            case CATEGORY_NAME_QUERY_PARAM:
              return CATEGORY_VALUE;
            case NQ_NAME_QUERY_PARAM:
              return NQ_VALUE;
          }
        });
        let testInput =
          {
            requestParams: {
              [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
              [NQ]: NQ_VALUE,
              [SUB_ID]: SUB_ID_VALUE,
            },
            expectedPid: DATA_PARTNER_PIXEL_ID_VALUE,
            expectedNq: [NQ_VALUE],
            expectedCategory: [null],
            expectedSubId: SUB_ID_VALUE,
            expectedCors: mockOriginAddress,
            expectedRef: mockRefAddress,
          };
        let request = nanoBidAdapter.buildRequests([
          getBidRequest(testInput.requestParams)]);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENGINE_BASE_URL);
        expect(request.data).to.equal(JSON.stringify([
          getBidResponse(
            testInput.expectedPid,
            testInput.expectedNq,
            testInput.expectedCategory,
            testInput.expectedSubId,
            testInput.expectedCors,
            testInput.expectedRef
          ),
        ]));
        sandbox.restore();
      });
      it('Test buildRequest() - pid, category', function () {
        let mockOriginAddress = 'http://localhost';
        let mockRefAddress = 'http://some-ref.test';
        let sandbox = sinon.sandbox.create();
        sandbox.stub(utils, 'getOrigin').callsFake(() => mockOriginAddress);
        sandbox.stub(utils, 'getTopWindowReferrer').callsFake(() => mockRefAddress);
        sandbox.stub(utils, 'getParameterByName').callsFake((arg) => {
          switch (arg) {
            case CATEGORY_NAME_QUERY_PARAM:
              return CATEGORY_VALUE;
            case NQ_NAME_QUERY_PARAM:
              return NQ_VALUE;
          }
        });
        let testInput =
          {
            requestParams: {
              [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
              [CATEGORY]: CATEGORY_VALUE,
            },
            expectedPid: DATA_PARTNER_PIXEL_ID_VALUE,
            expectedNq: [null],
            expectedCategory: [CATEGORY_VALUE],
            expectedSubId: null,
            expectedCors: mockOriginAddress,
            expectedRef: mockRefAddress,
          };
        let request = nanoBidAdapter.buildRequests([
          getBidRequest(testInput.requestParams)]);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENGINE_BASE_URL);
        expect(request.data).to.equal(JSON.stringify([
          getBidResponse(
            testInput.expectedPid,
            testInput.expectedNq,
            testInput.expectedCategory,
            testInput.expectedSubId,
            testInput.expectedCors,
            testInput.expectedRef
          ),
        ]));
        sandbox.restore();
      });
      it('Test buildRequest() - pid, category, subId', function () {
        let mockOriginAddress = 'http://localhost';
        let mockRefAddress = 'http://some-ref.test';
        let sandbox = sinon.sandbox.create();
        sandbox.stub(utils, 'getOrigin').callsFake(() => mockOriginAddress);
        sandbox.stub(utils, 'getTopWindowReferrer').callsFake(() => mockRefAddress);
        sandbox.stub(utils, 'getParameterByName').callsFake((arg) => {
          switch (arg) {
            case CATEGORY_NAME_QUERY_PARAM:
              return CATEGORY_VALUE;
            case NQ_NAME_QUERY_PARAM:
              return NQ_VALUE;
          }
        });
        let testInput =
          {
            requestParams: {
              [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
              [CATEGORY]: CATEGORY_VALUE,
              [SUB_ID]: SUB_ID_VALUE,
            },
            expectedPid: DATA_PARTNER_PIXEL_ID_VALUE,
            expectedNq: [null],
            expectedCategory: [CATEGORY_VALUE],
            expectedSubId: SUB_ID_VALUE,
            expectedCors: mockOriginAddress,
            expectedRef: mockRefAddress,
          };
        let request = nanoBidAdapter.buildRequests([
          getBidRequest(testInput.requestParams)]);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENGINE_BASE_URL);
        expect(request.data).to.equal(JSON.stringify([
          getBidResponse(
            testInput.expectedPid,
            testInput.expectedNq,
            testInput.expectedCategory,
            testInput.expectedSubId,
            testInput.expectedCors,
            testInput.expectedRef
          ),
        ]));
        sandbox.restore();
      });
      it('Test buildRequest() - pid, subId', function () {
        let mockOriginAddress = 'http://localhost';
        let mockRefAddress = 'http://some-ref.test';
        let sandbox = sinon.sandbox.create();
        sandbox.stub(utils, 'getOrigin').callsFake(() => mockOriginAddress);
        sandbox.stub(utils, 'getTopWindowReferrer').callsFake(() => mockRefAddress);
        sandbox.stub(utils, 'getParameterByName').callsFake((arg) => {
          switch (arg) {
            case CATEGORY_NAME_QUERY_PARAM:
              return CATEGORY_VALUE;
            case NQ_NAME_QUERY_PARAM:
              return NQ_VALUE;
          }
        });
        let testInput =
          {
            requestParams: {
              [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
              [SUB_ID]: SUB_ID_VALUE,
            },
            expectedPid: DATA_PARTNER_PIXEL_ID_VALUE,
            expectedNq: [null],
            expectedCategory: [null],
            expectedSubId: SUB_ID_VALUE,
            expectedCors: mockOriginAddress,
            expectedRef: mockRefAddress,
          };
        let request = nanoBidAdapter.buildRequests([
          getBidRequest(testInput.requestParams)]);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENGINE_BASE_URL);
        expect(request.data).to.equal(JSON.stringify([
          getBidResponse(
            testInput.expectedPid,
            testInput.expectedNq,
            testInput.expectedCategory,
            testInput.expectedSubId,
            testInput.expectedCors,
            testInput.expectedRef
          ),
        ]));
        sandbox.restore();
      });
      it('Test buildRequest() - pid, nq, category, subId', function () {
        let mockOriginAddress = 'http://localhost';
        let mockRefAddress = 'http://some-ref.test';
        let sandbox = sinon.sandbox.create();
        sandbox.stub(utils, 'getOrigin').callsFake(() => mockOriginAddress);
        sandbox.stub(utils, 'getTopWindowReferrer').callsFake(() => mockRefAddress);
        sandbox.stub(utils, 'getParameterByName').callsFake((arg) => {
          switch (arg) {
            case CATEGORY_NAME_QUERY_PARAM:
              return CATEGORY_VALUE;
            case NQ_NAME_QUERY_PARAM:
              return NQ_VALUE;
          }
        });
        let testInput =
          {
            requestParams: {
              [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
              [NQ]: NQ_VALUE,
              [CATEGORY]: CATEGORY_VALUE,
              [SUB_ID]: SUB_ID_VALUE,
            },
            expectedPid: DATA_PARTNER_PIXEL_ID_VALUE,
            expectedNq: [NQ_VALUE],
            expectedCategory: [CATEGORY_VALUE],
            expectedSubId: SUB_ID_VALUE,
            expectedCors: mockOriginAddress,
            expectedRef: mockRefAddress,
          };
        let request = nanoBidAdapter.buildRequests([
          getBidRequest(testInput.requestParams)]);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENGINE_BASE_URL);
        expect(request.data).to.equal(JSON.stringify([
          getBidResponse(
            testInput.expectedPid,
            testInput.expectedNq,
            testInput.expectedCategory,
            testInput.expectedSubId,
            testInput.expectedCors,
            testInput.expectedRef
          ),
        ]));
        sandbox.restore();
      });
      it('Test buildRequest() - pid, nqName, categoryName, subId', function () {
        let mockOriginAddress = 'http://localhost';
        let mockRefAddress = 'http://some-ref.test';
        let sandbox = sinon.sandbox.create();
        sandbox.stub(utils, 'getOrigin').callsFake(() => mockOriginAddress);
        sandbox.stub(utils, 'getTopWindowReferrer').callsFake(() => mockRefAddress);
        sandbox.stub(utils, 'getParameterByName').callsFake((arg) => {
          switch (arg) {
            case CATEGORY_NAME_QUERY_PARAM:
              return CATEGORY_VALUE;
            case NQ_NAME_QUERY_PARAM:
              return NQ_VALUE;
          }
        });
        let testInput =
          {
            requestParams: {
              [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
              [NQ_NAME]: NQ_NAME_QUERY_PARAM,
              [CATEGORY_NAME]: CATEGORY_NAME_QUERY_PARAM,
              [SUB_ID]: SUB_ID_VALUE,
            },
            expectedPid: DATA_PARTNER_PIXEL_ID_VALUE,
            expectedNq: [NQ_VALUE],
            expectedCategory: [CATEGORY_VALUE],
            expectedSubId: SUB_ID_VALUE,
            expectedCors: mockOriginAddress,
            expectedRef: mockRefAddress,
          };
        let request = nanoBidAdapter.buildRequests([
          getBidRequest(testInput.requestParams)]);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENGINE_BASE_URL);
        expect(request.data).to.equal(JSON.stringify([
          getBidResponse(
            testInput.expectedPid,
            testInput.expectedNq,
            testInput.expectedCategory,
            testInput.expectedSubId,
            testInput.expectedCors,
            testInput.expectedRef
          ),
        ]));
        sandbox.restore();
      });
      it('Test buildRequest() - pid, nq, category, subId, ref (value none)', function () {
        let mockOriginAddress = 'http://localhost';
        let mockRefAddress = 'http://some-ref.test';
        let sandbox = sinon.sandbox.create();
        sandbox.stub(utils, 'getOrigin').callsFake(() => mockOriginAddress);
        sandbox.stub(utils, 'getTopWindowReferrer').callsFake(() => mockRefAddress);
        sandbox.stub(utils, 'getParameterByName').callsFake((arg) => {
          switch (arg) {
            case CATEGORY_NAME_QUERY_PARAM:
              return CATEGORY_VALUE;
            case NQ_NAME_QUERY_PARAM:
              return NQ_VALUE;
          }
        });
        let testInput =
          {
            requestParams: {
              [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
              [NQ]: NQ_VALUE,
              [CATEGORY]: CATEGORY_VALUE,
              [SUB_ID]: SUB_ID_VALUE,
              [REF]: REF_NO_VALUE,
            },
            expectedPid: DATA_PARTNER_PIXEL_ID_VALUE,
            expectedNq: [NQ_VALUE],
            expectedCategory: [CATEGORY_VALUE],
            expectedSubId: SUB_ID_VALUE,
            expectedCors: mockOriginAddress,
            expectedRef: null,
          };
        let request = nanoBidAdapter.buildRequests([
          getBidRequest(testInput.requestParams)]);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENGINE_BASE_URL);
        expect(request.data).to.equal(JSON.stringify([
          getBidResponse(
            testInput.expectedPid,
            testInput.expectedNq,
            testInput.expectedCategory,
            testInput.expectedSubId,
            testInput.expectedCors,
            testInput.expectedRef
          ),
        ]));
        sandbox.restore();
      });
      it('Test buildRequest() - pid, nq, category, subId, ref (value other)', function () {
        let mockOriginAddress = 'http://localhost';
        let mockRefAddress = 'http://some-ref.test';
        let sandbox = sinon.sandbox.create();
        sandbox.stub(utils, 'getOrigin').callsFake(() => mockOriginAddress);
        sandbox.stub(utils, 'getTopWindowReferrer').callsFake(() => mockRefAddress);
        sandbox.stub(utils, 'getParameterByName').callsFake((arg) => {
          switch (arg) {
            case CATEGORY_NAME_QUERY_PARAM:
              return CATEGORY_VALUE;
            case NQ_NAME_QUERY_PARAM:
              return NQ_VALUE;
          }
        });
        let testInput =
          {
            requestParams: {
              [DATA_PARTNER_PIXEL_ID]: DATA_PARTNER_PIXEL_ID_VALUE,
              [NQ]: NQ_VALUE,
              [CATEGORY]: CATEGORY_VALUE,
              [SUB_ID]: SUB_ID_VALUE,
              [REF]: REF_OTHER_VALUE,
            },
            expectedPid: DATA_PARTNER_PIXEL_ID_VALUE,
            expectedNq: [NQ_VALUE],
            expectedCategory: [CATEGORY_VALUE],
            expectedSubId: SUB_ID_VALUE,
            expectedCors: mockOriginAddress,
            expectedRef: null,
          };
        let request = nanoBidAdapter.buildRequests([
          getBidRequest(testInput.requestParams)]);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENGINE_BASE_URL);
        expect(request.data).to.equal(JSON.stringify([
          getBidResponse(
            testInput.expectedPid,
            testInput.expectedNq,
            testInput.expectedCategory,
            testInput.expectedSubId,
            testInput.expectedCors,
            testInput.expectedRef
          ),
        ]));
        sandbox.restore();
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
