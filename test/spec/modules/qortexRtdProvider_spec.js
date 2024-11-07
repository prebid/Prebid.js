import * as utils from 'src/utils.js';
import * as events from 'src/events.js';
import { EVENTS } from '../../../src/constants.js';
import {loadExternalScript} from 'src/adloader.js';
import {
  qortexSubmodule as module,
  getContext,
  getGroupConfig,
  generateAnalyticsEventObject,
  generateAnalyticsHostUrl,
  addContextToRequests,
  setContextData,
  loadScriptTag,
  initializeModuleData,
  setGroupConfigData,
  saveContextAdded,
  initializeBidEnrichment,
  getContextAddedEntry,
  windowPostMessageReceived,
  resetRateLimitTimeout
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
  const validQortexPostMessage = {
    target: 'QORTEX-PREBIDJS-RTD-MODULE',
    message: 'CX-BID-ENRICH-INITIALIZED'
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
    it('returns true for valid config object', (done) => {
      const result = module.init(validModuleConfig);
      expect(server.requests.length).to.be.eql(1)
      const groupConfigReq = server.requests[0];
      groupConfigReq.respond(200, responseHeaders, validGroupConfigResponse);
      setTimeout(() => {
        expect(result).to.be.true;
        done()
      }, 500)
    })

    it('logs warning when group config does not pass setup conditions', (done) => {
      const result = module.init(validModuleConfig);
      expect(server.requests.length).to.be.eql(1)
      const groupConfigReq = server.requests[0];
      groupConfigReq.respond(200, responseHeaders, inactiveGroupConfigResponse);
      setTimeout(() => {
        expect(logWarnSpy.calledWith('Group config is not configured for qortex bid enrichment')).to.be.true;
        done()
      }, 500)
    })

    it('logs warning when group config request errors', (done) => {
      const result = module.init(validModuleConfig);
      server.requests[0].respond(404, responseHeaders, inactiveGroupConfigResponse);
      setTimeout(() => {
        expect(logWarnSpy.calledWith('No Group Config found')).to.be.true;
        done()
      }, 500)
    })

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
      global.lookupRateLimitTimeout = null;
    })

    afterEach(() => {
      initializeModuleData(emptyModuleConfig);
      callbackSpy.resetHistory();
      global.lookupRateLimitTimeout = null;
    })

    it('will call callback immediately if no adunits', () => {
      const reqBidsConfigNoBids = { adUnits: [] };
      module.getBidRequestData(reqBidsConfigNoBids, callbackSpy);
      expect(callbackSpy.calledOnce).to.be.true;
      expect(logWarnSpy.calledOnce).to.be.true;
    })

    it('will call callback if getContext does not throw', (done) => {
      const cb = function () {
        expect(logWarnSpy.calledOnce).to.be.false;
        done();
      }
      module.getBidRequestData(reqBidsConfig, cb);
      server.requests[0].respond(200, responseHeaders, contextResponse);
    })

    it('will log message call callback if context data has already been collected', (done) => {
      setContextData(contextResponseObj);
      module.getBidRequestData(reqBidsConfig, callbackSpy);
      setTimeout(() => {
        expect(server.requests.length).to.be.eql(0);
        expect(logMessageSpy.calledWith('Adding Content object from existing context data')).to.be.true;
        done();
      }, 250)
    })

    it('will catch and log error and fire callback', (done) => {
      module.getBidRequestData(reqBidsConfig, callbackSpy);
      server.requests[0].respond(404, responseHeaders, JSON.stringify({}));
      setTimeout(() => {
        expect(logWarnSpy.calledWith('Returned error status code: 404')).to.be.eql(true);
        expect(callbackSpy.calledOnce).to.be.true;
        done();
      }, 250)
    })

    it('will not request context if group config toggle is false', (done) => {
      setGroupConfigData(inactiveGroupConfigResponseObj);
      const cb = function () {
        expect(server.requests.length).to.be.eql(0);
        expect(logWarnSpy.called).to.be.true;
        expect(logWarnSpy.calledWith('Bid enrichment disabled at group config')).to.be.true;
        done();
      }
      module.getBidRequestData(reqBidsConfig, cb);
    })

    it('Logs warning for network error', (done) => {
      saveContextAdded(reqBidsConfig);
      const testData = {auctionId: reqBidsConfig.auctionId, data: 'data'};
      module.onAuctionEndEvent(testData);
      server.requests[0].respond(500, responseHeaders, JSON.stringify({}));
      setTimeout(() => {
        expect(logWarnSpy.calledWith('Returned error status code: 500')).to.be.eql(true);
        done();
      }, 200)
    })

    it('Logs warning for rate limit', (done) => {
      saveContextAdded(reqBidsConfig);
      const testData = {auctionId: reqBidsConfig.auctionId, data: 'data'};
      module.onAuctionEndEvent(testData);
      server.requests[0].respond(429, responseHeaders, JSON.stringify({}));
      setTimeout(() => {
        expect(logWarnSpy.calledWith('Returned error status code: 429')).to.be.eql(true);
        done();
      }, 200)
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

    it('Properly sends analytics event with valid config', (done) => {
      saveContextAdded(reqBidsConfig);
      const testData = {auctionId: reqBidsConfig.auctionId, data: 'data'};
      module.onAuctionEndEvent(testData);
      const request = server.requests[0];
      expect(request.url).to.be.eql('https://events.qortex.ai/api/v1/player-event');
      server.requests[0].respond(200, responseHeaders, JSON.stringify({}));
      setTimeout(() => {
        expect(logMessageSpy.calledWith('Qortex analytics event sent')).to.be.true
        done();
      }, 200)
    })

    it('Logs warning for rejected analytics request', (done) => {
      const invalidPercentageConfig = cloneDeep(validGroupConfigResponseObj);
      invalidPercentageConfig.prebidReportingPercentage = -1;
      setGroupConfigData(invalidPercentageConfig);
      const testData = {data: 'data'};
      module.onAuctionEndEvent(testData);
      expect(server.requests.length).to.be.eql(0);
      setTimeout(() => {
        expect(logWarnSpy.calledWith('Current request did not meet analytics percentage threshold, cancelling sending event')).to.be.true
        done();
      }, 200)
    })
  })

  describe('getContext', () => {
    beforeEach(() => {
      initializeModuleData(validModuleConfig);
    })

    afterEach(() => {
      initializeModuleData(emptyModuleConfig);
    })

    it('returns a promise', () => {
      const result = getContext();
      expect(result).to.be.a('promise');
    })

    it('uses request url generated from initialize function in config and resolves to content object data', (done) => {
      let requestUrl = `${validModuleConfig.params.apiUrl}/api/v1/prebid/${validModuleConfig.params.groupId}/page/lookup`;
      const ctx = getContext()
      const request = server.requests[0]
      request.respond(200, responseHeaders, contextResponse);
      ctx.then(response => {
        expect(server.requests.length).to.be.eql(1);
        expect(request.url).to.be.eql(requestUrl);
        expect(response).to.be.eql(contextResponseObj.content);
        done();
      });
    })

    it('returns null when necessary', (done) => {
      const ctx = getContext()
      server.requests[0].respond(202, responseHeaders, JSON.stringify({}))
      ctx.then(response => {
        expect(response).to.be.null;
        expect(server.requests.length).to.be.eql(1);
        expect(logWarnSpy.called).to.be.false;
        done();
      });
    })

    it('request content object after elapsed rate limit timeout if a second content lookup was delayed', (done) => {
      const ctx = getContext();
      server.requests[0].respond(202, responseHeaders, JSON.stringify({}))
      ctx.then(response => {
        expect(response).to.be.null;
        expect(logMessageSpy.calledWith('Requesting new context data')).to.be.true;
        expect(server.requests.length).to.be.eql(1);
        expect(logWarnSpy.called).to.be.false;
      });
      setTimeout(() => {
        const ctx2 = getContext();
        ctx2.catch(e => {
          expect(e.message).to.equal('429');
          expect(logMessageSpy.calledWith('Content lookup attempted during rate limit waiting period of 5000ms.')).to.be.true;
          resetRateLimitTimeout();
          done();
        })
      }, 200)
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

    it('saves context added entry with skipped flag if valid request does not meet threshold', () => {
      initializeModuleData(validModuleConfig);
      setContextData(contextResponseObj.content);
      setGroupConfigData(noEnrichmentGroupConfigResponseObj);
      addContextToRequests(reqBidsConfig);
      const contextAdded = getContextAddedEntry(reqBidsConfig.auctionId);
      expect(contextAdded).to.not.be.null;
      expect(contextAdded.contextSkipped).to.eql(true);
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

  describe('generateAnalyticsEventObject', () => {
    let qortexSessionInfo;
    beforeEach(() => {
      qortexSessionInfo = initializeModuleData(validModuleConfig);
      setGroupConfigData(validGroupConfigResponseObj);
    })

    afterEach(() => {
      initializeModuleData(emptyModuleConfig);
      setGroupConfigData(null);
    })

    it('returns expected object', () => {
      const testEventType = 'TEST';
      const testSubType = 'TEST_SUBTYPE';
      const testData = {data: 'data'};

      const result = generateAnalyticsEventObject(testEventType, testSubType, testData);

      expect(result.sessionId).to.be.eql(qortexSessionInfo.sessionId);
      expect(result.groupId).to.be.eql(qortexSessionInfo.groupId);
      expect(result.eventType).to.be.eql(testEventType);
      expect(result.subType).to.be.eql(testSubType);
      expect(result.eventOriginSource).to.be.eql('RTD');
      expect(result.data).to.be.eql(testData);
    })
  })

  describe('generateAnalyticsHostUrl', () => {
    it('will use qortex analytics host when appropriate', () => {
      const hostUrl = generateAnalyticsHostUrl(defaultApiHost);
      expect(hostUrl).to.be.eql('https://events.qortex.ai/api/v1/player-event');
    })

    it('will use qortex stage analytics host when appropriate', () => {
      const hostUrl = generateAnalyticsHostUrl('https://stg-demand.qortex.ai');
      expect(hostUrl).to.be.eql('https://stg-events.qortex.ai/api/v1/player-event');
    })

    it('will default to dev analytics host when appropriate', () => {
      const hostUrl = generateAnalyticsHostUrl('https://dev-demand.qortex.ai');
      expect(hostUrl).to.be.eql('https://dev-events.qortex.ai/api/v1/player-event');
    })
  })

  describe('getGroupConfig', () => {
    let sessionInfo;

    beforeEach(() => {
      sessionInfo = initializeModuleData(validModuleConfig);
    })

    afterEach(() => {
      initializeModuleData(emptyModuleConfig);
      setGroupConfigData(null);
      setContextData(null);
      server.reset();
    })

    it('returns a promise', () => {
      const result = getGroupConfig();
      expect(result).to.be.a('promise');
    })

    it('processes group config response in valid conditions', (done) => {
      const result = getGroupConfig();
      const request = server.requests[0]
      request.respond(200, responseHeaders, validGroupConfigResponse);
      result.then(response => {
        expect(request.url).to.be.eql(sessionInfo.groupConfigUrl);
        expect(response.groupId).to.be.eql(validGroupConfigResponseObj.groupId);
        expect(response.active).to.be.eql(validGroupConfigResponseObj.active);
        expect(response.prebidBidEnrichment).to.be.eql(validGroupConfigResponseObj.prebidBidEnrichment);
        expect(response.prebidReportingPercentage).to.be.eql(validGroupConfigResponseObj.prebidReportingPercentage);
        done();
      })
    })
  })

  describe('initializeBidEnrichment', () => {
    beforeEach(() => {
      initializeModuleData(validModuleConfig);
      setGroupConfigData(validGroupConfigResponseObj);
      setContextData(null);
      server.reset();
    })

    afterEach(() => {
      setGroupConfigData(null);
      setContextData(null);
      server.reset();
    })

    it('sets context data if applicable', (done) => {
      initializeBidEnrichment();
      server.requests[0].respond(200, responseHeaders, contextResponse);
      setTimeout(() => {
        expect(logMessageSpy.calledWith('Contextual record Received from Qortex API')).to.be.true;
        done()
      }, 250)
    })

    it('logs warning if no record has been made', (done) => {
      initializeBidEnrichment();
      server.requests[0].respond(202, responseHeaders, JSON.stringify({}));
      setTimeout(() => {
        expect(logWarnSpy.calledWith('Contexual record is not yet complete at this time')).to.be.true;
        done();
      }, 250)
    })

    it('processes incoming qortex component "initialize" message', () => {
      postMessage(validQortexPostMessage);
    })

    it('will catch and log error and fire callback', (done) => {
      initializeBidEnrichment();
      server.requests[0].respond(404, responseHeaders, JSON.stringify({}));
      setTimeout(() => {
        expect(logWarnSpy.calledWith('Returned error status code: 404')).to.be.eql(true);
        done();
      }, 250)
    })

    it('Logs warning for network error', (done) => {
      initializeBidEnrichment();
      server.requests[0].respond(500, responseHeaders, JSON.stringify({}));
      setTimeout(() => {
        expect(logWarnSpy.calledWith('Returned error status code: 500')).to.be.eql(true);
        done();
      }, 200)
    })
  })
})
