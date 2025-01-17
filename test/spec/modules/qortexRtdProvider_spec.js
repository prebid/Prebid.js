import * as utils from 'src/utils.js';
import * as events from 'src/events.js';
import { EVENTS } from '../../../src/constants.js';
import {loadExternalScript} from 'src/adloader.js';
import {
  qortexSubmodule as module,
  addContextToRequests,
  setContextData,
  loadScriptTag,
  initializeModuleData,
  setGroupConfigData,
  requestContextData,
  windowPostMessageReceived
} from '../../../modules/qortexRtdProvider';
import {server} from '../../mocks/xhr.js';
import { cloneDeep } from 'lodash';

describe('qortexRtdProvider', () => {
  let logWarnSpy;
  let logMessageSpy;
  let ortb2Stub;

  const defaultApiHost = 'https://demand.qortex.ai';
  const defaultGroupId = 'test';
  const validBidderArray = ['qortex', 'test'];
  const validTagConfig = {
    videoContainer: 'my-video-container'
  }
  const validModuleConfig = {
    params: {
      groupId: defaultGroupId,
      apiUrl: defaultApiHost,
      bidders: validBidderArray,
      enableBidEnrichment: true
    }
  }
  const bidEnrichmentDisabledModuleConfig = {
    params: {
      groupId: defaultGroupId,
      apiUrl: defaultApiHost,
      bidders: validBidderArray
    }
  }
  const invalidApiUrlModuleConfig = {
    params: {
      groupId: defaultGroupId,
      apiUrl: 'test123',
      bidders: validBidderArray
    }
  }
  const emptyModuleConfig = {
    params: {}
  }
  const validImpressionEvent = {
    detail: {
      uid: 'uid123',
      type: 'qx-impression'
    }
  }
  const validImpressionEvent2 = {
    detail: {
      uid: 'uid1234',
      type: 'qx-impression'
    }
  }
  const missingIdImpressionEvent = {
    detail: {
      type: 'qx-impression'
    }
  }
  const QortexPostMessageInitialized = {
    target: 'QORTEX-PREBIDJS-RTD-MODULE',
    message: 'CX-BID-ENRICH-INITIALIZED',
    params: {groupConfig: {data: true}}
  }
  const QortexPostMessageContext = {
    target: 'QORTEX-PREBIDJS-RTD-MODULE',
    message: 'DISPATCH-CONTEXT',
    params: {context: {data: true}}
  }
  const invalidTypeQortexEvent = {
    detail: {
      type: 'invalid-type'
    }
  }
  const responseHeaders = {
    'content-type': 'application/json',
    'access-control-allow-origin': '*'
  };
  const contextResponseObj = {
    content: {
      id: '123456',
      episode: 15,
      title: 'test episode',
      series: 'test show',
      season: '1',
      url: 'https://example.com/file.mp4'
    }
  }
  const contextResponse = JSON.stringify(contextResponseObj);
  const validGroupConfigResponseObj = {
    groupId: defaultGroupId,
    active: true,
    prebidBidEnrichment: true,
    prebidBidEnrichmentPercentage: 100,
    prebidReportingPercentage: 100
  }
  const validGroupConfigResponse = JSON.stringify(validGroupConfigResponseObj);
  const inactiveGroupConfigResponseObj = {
    groupId: defaultGroupId,
    active: false,
    PrebidBidEnrichment: true,
    PrebidReportingPercentage: 100
  }
  const inactiveGroupConfigResponse = JSON.stringify(inactiveGroupConfigResponseObj);
  const noEnrichmentGroupConfigResponseObj = {
    groupId: defaultGroupId,
    active: true,
    prebidBidEnrichment: true,
    prebidBidEnrichmentPercentage: 0,
    prebidReportingPercentage: 100
  }
  const reqBidsConfig = {
    auctionId: '1234',
    adUnits: [{
      bids: [
        { bidder: 'qortex' }
      ]
    }],
    ortb2Fragments: {
      bidder: {},
      global: {}
    }
  }

  beforeEach(() => {
    ortb2Stub = sinon.stub(reqBidsConfig, 'ortb2Fragments').value({bidder: {}, global: {}})
    logWarnSpy = sinon.spy(utils, 'logWarn');
    logMessageSpy = sinon.spy(utils, 'logMessage');
  })

  afterEach(() => {
    logWarnSpy.restore();
    logMessageSpy.restore();
    ortb2Stub.restore();
    setContextData(null);
  })

  describe('init', () => {
    it('will not initialize bid enrichment if it is disabled', () => {
      module.init(bidEnrichmentDisabledModuleConfig);
      expect(logWarnSpy.calledWith('Bid Enrichment Function has been disabled in module configuration')).to.be.true;
    })

    it('returns false and logs error for missing groupId', () => {
      expect(module.init(emptyModuleConfig)).to.be.false;
      expect(logWarnSpy.calledOnce).to.be.true;
      expect(logWarnSpy.calledWith('Qortex RTD module config does not contain valid groupId parameter. Config params: {}')).to.be.ok;
    })

    it('loads Qortex script if tagConfig is present in module config params', () => {
      const config = cloneDeep(validModuleConfig);
      config.params.tagConfig = validTagConfig;
      expect(module.init(config)).to.be.true;
      expect(loadExternalScript.calledOnce).to.be.true;
    })
  })

  describe('loadScriptTag', () => {
    let addEventListenerSpy;
    let billableEvents = [];

    let config = cloneDeep(validModuleConfig);
    config.params.tagConfig = validTagConfig;

    events.on(EVENTS.BILLABLE_EVENT, (e) => {
      billableEvents.push(e);
    })

    beforeEach(() => {
      initializeModuleData(config);
      addEventListenerSpy = sinon.spy(window, 'addEventListener');
    })

    afterEach(() => {
      addEventListenerSpy.restore();
      billableEvents = [];
    })

    it('adds event listener', () => {
      loadScriptTag(config);
      expect(addEventListenerSpy.calledOnce).to.be.true;
    })

    it('parses incoming qortex-impression events', () => {
      loadScriptTag(config);
      dispatchEvent(new CustomEvent('qortex-rtd', validImpressionEvent));
      expect(billableEvents.length).to.be.equal(1);
      expect(billableEvents[0].type).to.be.equal(validImpressionEvent.detail.type);
      expect(billableEvents[0].transactionId).to.be.equal(validImpressionEvent.detail.uid);
    })

    it('will emit two events for impressions with two different ids', () => {
      loadScriptTag(config);
      dispatchEvent(new CustomEvent('qortex-rtd', validImpressionEvent));
      dispatchEvent(new CustomEvent('qortex-rtd', validImpressionEvent2));
      expect(billableEvents.length).to.be.equal(2);
      expect(billableEvents[0].transactionId).to.be.equal(validImpressionEvent.detail.uid);
      expect(billableEvents[1].transactionId).to.be.equal(validImpressionEvent2.detail.uid);
    })

    it('will not allow multiple events with the same id', () => {
      loadScriptTag(config);
      dispatchEvent(new CustomEvent('qortex-rtd', validImpressionEvent));
      dispatchEvent(new CustomEvent('qortex-rtd', validImpressionEvent));
      expect(billableEvents.length).to.be.equal(1);
      expect(logWarnSpy.calledWith('Received invalid billable event due to duplicate uid: qx-impression')).to.be.ok;
    })

    it('will not allow events with missing uid', () => {
      loadScriptTag(config);
      dispatchEvent(new CustomEvent('qortex-rtd', missingIdImpressionEvent));
      expect(billableEvents.length).to.be.equal(0);
      expect(logWarnSpy.calledWith('Received invalid billable event due to missing uid: qx-impression')).to.be.ok;
    })

    it('will not allow events with unavailable type', () => {
      loadScriptTag(config);
      dispatchEvent(new CustomEvent('qortex-rtd', invalidTypeQortexEvent));
      expect(billableEvents.length).to.be.equal(0);
      expect(logWarnSpy.calledWith('Received invalid billable event: invalid-type')).to.be.ok;
    })
  })

  describe('getBidRequestData', () => {
    let callbackSpy;

    beforeEach(() => {
      initializeModuleData(validModuleConfig);
      setGroupConfigData(validGroupConfigResponseObj);
      callbackSpy = sinon.spy();
      server.reset();
    })

    afterEach(() => {
      initializeModuleData(emptyModuleConfig);
      callbackSpy.resetHistory();
    })

    it('will call callback immediately if no adunits', () => {
      const reqBidsConfigNoBids = { adUnits: [] };
      module.getBidRequestData(reqBidsConfigNoBids, callbackSpy);
      expect(callbackSpy.calledOnce).to.be.true;
      expect(logWarnSpy.calledOnce).to.be.true;
    })

    it('will not request context if prebid disable toggle is true', (done) => {
      initializeModuleData(bidEnrichmentDisabledModuleConfig);
      const cb = function () {
        expect(server.requests.length).to.be.eql(0);
        expect(logWarnSpy.called).to.be.true;
        expect(logWarnSpy.calledWith('Bid enrichment disabled at prebid config')).to.be.true;
        done();
      }
      module.getBidRequestData(reqBidsConfig, cb);
    })

    it('will request to add context when ad units present and enabled', (done) => {
      const cb = function () {
        setContextData(null);
        expect(server.requests.length).to.be.eql(0);
        expect(logWarnSpy.called).to.be.true;
        expect(logWarnSpy.calledWith('No context data received at this time')).to.be.true;
        done();
      }
      module.getBidRequestData(reqBidsConfig, cb);
    })
  })

  describe('onAuctionEndEvent', () => {
    beforeEach(() => {
      initializeModuleData(validModuleConfig);
      setGroupConfigData(validGroupConfigResponseObj);
    })

    afterEach(() => {
      initializeModuleData(emptyModuleConfig);
      setGroupConfigData(null);
    })

    it('Properly sends analytics event with valid config', () => {
      const testData = {auctionId: reqBidsConfig.auctionId, data: 'data'};
      module.onAuctionEndEvent(testData);
    })
  })

  describe('requestContextData', () => {
    before(() => {
      setContextData({data: true});
    })

    after(() => {
      setContextData(null);
    })

    it('Will log properly when context data already available', () => {
      requestContextData();
      expect(logMessageSpy.calledWith('Context data already retrieved.')).to.be.true;
    })
  })

  describe('addContextToRequests', () => {
    let testReqBids;
    beforeEach(() => {
      setGroupConfigData(validGroupConfigResponseObj);
      testReqBids = {
        auctionId: '1234',
        adUnits: [{
          bids: [
            { bidder: 'qortex' }
          ]
        }],
        ortb2Fragments: {
          bidder: {},
          global: {}
        }
      }
    })

    afterEach(() => {
      setGroupConfigData(null);
    })

    it('logs error if no data was retrieved from get context call', () => {
      initializeModuleData(validModuleConfig);
      addContextToRequests(reqBidsConfig);
      expect(logWarnSpy.calledOnce).to.be.true;
      expect(logWarnSpy.calledWith('No context data received at this time')).to.be.ok;
      expect(reqBidsConfig.ortb2Fragments.global).to.be.eql({});
      expect(reqBidsConfig.ortb2Fragments.bidder).to.be.eql({});
    })

    it('adds site.content only to global ortb2 when bidders array is omitted', () => {
      const omittedBidderArrayConfig = cloneDeep(validModuleConfig);
      delete omittedBidderArrayConfig.params.bidders;
      initializeModuleData(omittedBidderArrayConfig);
      setContextData(contextResponseObj.content);
      addContextToRequests(reqBidsConfig);
      expect(reqBidsConfig.ortb2Fragments.global).to.have.property('site');
      expect(reqBidsConfig.ortb2Fragments.global.site).to.have.property('content');
      expect(reqBidsConfig.ortb2Fragments.global.site.content).to.be.eql(contextResponseObj.content);
      expect(reqBidsConfig.ortb2Fragments.bidder).to.be.eql({});
    })

    it('adds site.content only to bidder ortb2 when bidders array is included', () => {
      initializeModuleData(validModuleConfig);
      setContextData(contextResponseObj.content);
      addContextToRequests(reqBidsConfig);

      const qortexOrtb2Fragment = reqBidsConfig.ortb2Fragments.bidder['qortex']
      expect(qortexOrtb2Fragment).to.not.be.null;
      expect(qortexOrtb2Fragment).to.have.property('site');
      expect(qortexOrtb2Fragment.site).to.have.property('content');
      expect(qortexOrtb2Fragment.site.content).to.be.eql(contextResponseObj.content);

      const testOrtb2Fragment = reqBidsConfig.ortb2Fragments.bidder['test']
      expect(testOrtb2Fragment).to.not.be.null;
      expect(testOrtb2Fragment).to.have.property('site');
      expect(testOrtb2Fragment.site).to.have.property('content');
      expect(testOrtb2Fragment.site.content).to.be.eql(contextResponseObj.content);

      expect(reqBidsConfig.ortb2Fragments.global).to.be.eql({});
    })

    it('logs error if there is an empty bidder array', () => {
      const invalidBidderArrayConfig = cloneDeep(validModuleConfig);
      invalidBidderArrayConfig.params.bidders = [];
      initializeModuleData(invalidBidderArrayConfig);
      setContextData(contextResponseObj.content)
      addContextToRequests(reqBidsConfig);

      expect(logWarnSpy.calledWith('Config contains an empty bidders array, unable to determine which bids to enrich')).to.be.ok;
      expect(reqBidsConfig.ortb2Fragments.global).to.be.eql({});
      expect(reqBidsConfig.ortb2Fragments.bidder).to.be.eql({});
    })
  })

  describe('initializeBidEnrichment', () => {
    beforeEach(() => {
      initializeModuleData(validModuleConfig);
      setGroupConfigData(validGroupConfigResponseObj);
      setContextData(null);
    })

    afterEach(() => {
      setGroupConfigData(null);
      setContextData(null);
    })

    it('processes incoming qortex component "initialize" message', () => {
      windowPostMessageReceived({data: QortexPostMessageInitialized})
    })

    it('processes incoming qortex component "context" message', () => {
      windowPostMessageReceived({data: QortexPostMessageContext})
    })
  })
})
