import eightPodAnalytics, { resetAdFrameRegistry, registerAdFrames } from 'modules/eightpodAnalyticsAdapter.js';
import { expect } from 'chai';
import adapterManager from 'src/adapterManager.js';
import { EVENTS } from '../../../src/constants.js';

const {
  BID_WON
} = EVENTS;

describe('eightPodAnalyticAdapter', function() {
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    adapterManager.enableAnalytics({
      provider: 'eightpod'
    });
  });

  afterEach(function() {
    sandbox.restore();
    eightPodAnalytics.disableAnalytics();
  });

  describe('track event', function() {
    beforeEach(function() {
      eightPodAnalytics.resetContext();
    });

    it('should not create context for non-bidWon events', function() {
      eightPodAnalytics.track({
        eventType: 'wrong_event_type',
      });

      expect(eightPodAnalytics.getContext()).to.deep.equal({});
    });

    it('should save context for eightpod bidWon events', function() {
      const ext = { dataLayerLogistic: { podId: 'podId' } };

      eightPodAnalytics.track({
        eventType: BID_WON,
        args: {
          adUnitCode: 'adUnitCode',
          bidder: 'eightpod',
          creativeId: 'creativeId',
          seatBidId: 'seatBidId',
          cid: 'campaignId',
          ext,
          params: {
            publisherId: 'publisherId',
            placementId: 'placementId',
            crid: 'crid',
          }
        }
      });

      expect(eightPodAnalytics.getContext()).to.deep.equal({
        adUnitCode: {
          bidId: 'seatBidId',
          campaignId: 'campaignId',
          placementId: 'placementId',
          publisherId: 'publisherId',
          variantId: 'creativeId',
          crid: 'crid',
          ext,
          advertiserDomains: [],
        }
      });
    });
  });

  describe('eventSubscribe', function() {
    let addEventListenerStub;
    let getContextStub;
    let messageHandler;
    let utag;

    beforeEach(function() {
      addEventListenerStub = sandbox.stub(window, 'addEventListener');
      getContextStub = sandbox.stub(eightPodAnalytics, 'getContext').returns({ adUnitCode: {} });
      resetAdFrameRegistry();
      eightPodAnalytics.eventSubscribe();
      const messageCalls = addEventListenerStub.getCalls().filter(c => c.args[0] === 'message');
      messageHandler = messageCalls[messageCalls.length - 1].args[1];
      utag = { view: sandbox.spy(), link: sandbox.spy() };
    });

    function makeEvent(detail, options = {}) {
      return {
        data: { detail },
        origin: options.origin ?? window.location.origin,
        source: options.source ?? {
          frameElement: {
            parentElement: { id: 'adUnitCode' },
            contentWindow: { utag }
          }
        }
      };
    }

    it('returns early when the message has no detail', async function() {
      await messageHandler({ data: {} });
      expect(utag.view.callCount).to.equal(0);
      expect(utag.link.callCount).to.equal(0);
    });

    it('does not call utag for events outside of tealiumTrackTypes', async function() {
      await messageHandler(makeEvent({ type: 'Counter', name: 'next_slide', payload: { v: 1 } }));
      expect(utag.view.callCount).to.equal(0);
      expect(utag.link.callCount).to.equal(0);
    });

    it('calls utag.view for pod_impression with full context payload', async function() {
      const ctx = {
        ext: {
          variantId: 'v-1',
          publisherId: 'pub-id',
          podLanguageCodes: ['en'],
          eids: [{
            source: '8podx.com',
            uids: [{ id: 'safe-user-id' }],
          }],
          dataLayerLogistic: {
            organisationId: 'org-1',
            organisationName: 'Org',
            accountId: 'acc-1',
            accountName: 'Acc',
            publisherName: 'Pub',
            publisherIabCategoryNames: ['IAB1'],
            publisherIabCategoryIds: [1, 2],
            publisherIabSubCategoryNames: ['Sub1'],
            publisherIabSubCategoryIds: [3],
            userId: 'u-1',
            userEmail: 'u@e.com',
            userAge: 30,
            userGender: 'M',
            userCity: 'NY',
            userState: 'NY',
            userCountry: 'US',
            podId: 'pod-1',
            podName: 'Pod',
            podCountryCode: 'US',
          },
        },
        campaignId: 'c-1',
        placementId: 'p-1',
        bidId: 'b-1',
      };
      getContextStub.returns({ adUnitCode: ctx });

      await messageHandler(makeEvent({ type: 'View', name: 'pod_impression', payload: { foo: 'bar' } }));

      expect(utag.view.callCount).to.equal(1);
      const eventData = utag.view.getCall(0).args[0];
      expect(eventData.tealium_event).to.equal('pod_impression');
      expect(eventData.rights_holder_id).to.equal('org-1');
      expect(eventData.publisher_iab_category_list_id).to.deep.equal(['1', '2']);
      expect(eventData.publisher_user_id).to.equal('u-1');
      expect(eventData.user_email).to.equal('safe-user-id');
      expect(eventData.user_age).to.equal('30');
      expect(eventData.pod_id).to.equal('pod-1');
      expect(eventData.bid_id).to.equal('b-1');
      expect(eventData.foo).to.equal('bar');
      expect(eventData.user_email).to.not.equal('u@e.com');
    });

    it('adds Iab_category fields for events listed in eventsWithIabs', async function() {
      const ctx = {
        ext: {
          dataLayerLogistic: {
            slideInfos: [
              { storyId: 'story-1', categoryNames: ['Sport'], categoryIds: [11] }
            ],
          },
        },
      };
      getContextStub.returns({ adUnitCode: ctx });

      await messageHandler(makeEvent({
        type: 'Link',
        name: 'carousel_swipe',
        storyId: 'story-1',
        payload: {},
      }));

      expect(utag.link.callCount).to.equal(1);
      const eventData = utag.link.getCall(0).args[0];
      expect(eventData.Iab_category_name).to.deep.equal(['Sport']);
      expect(eventData.Iab_category_id).to.deep.equal([11]);
    });

    it('falls back to empty defaults when context fields are absent', async function() {
      getContextStub.returns({ adUnitCode: {} });

      await messageHandler(makeEvent({
        type: 'View',
        name: 'pod_impression',
        payload: {},
      }));

      expect(utag.view.callCount).to.equal(1);
      const eventData = utag.view.getCall(0).args[0];
      expect(eventData.rights_holder_id).to.equal('');
      expect(eventData.publisher_iab_category_list_id).to.deep.equal([]);
      expect(eventData.user_age).to.equal('');
      expect(eventData.bid_id).to.equal('');
    });

    it('ignores messages from unrecognized ad units', async function() {
      getContextStub.returns({});

      await messageHandler(makeEvent({
        type: 'View',
        name: 'pod_impression',
        payload: {},
      }));

      expect(utag.view.callCount).to.equal(0);
    });

    it('ignores messages from disallowed origins', async function() {
      await messageHandler(makeEvent({
        type: 'View',
        name: 'pod_impression',
        payload: {},
      }, { origin: 'https://evil.example' }));

      expect(utag.view.callCount).to.equal(0);
    });

    it('ignores messages when frameElement access throws', async function() {
      const blockedSource = {};
      Object.defineProperty(blockedSource, 'frameElement', {
        get() {
          throw new DOMException('Blocked a frame with origin from accessing a cross-origin frame.');
        }
      });

      await messageHandler({
        data: { detail: { type: 'View', name: 'pod_impression', payload: {} } },
        origin: 'https://evil.example',
        source: blockedSource,
      });

      expect(utag.view.callCount).to.equal(0);
    });

    it('does not reject the handler when utag access throws', async function() {
      const contentWindow = {};
      Object.defineProperty(contentWindow, 'utag', {
        get() {
          throw new DOMException('Blocked a frame with origin from accessing a cross-origin frame.');
        }
      });

      await messageHandler(makeEvent({
        type: 'View',
        name: 'pod_impression',
        payload: {},
      }, {
        source: {
          frameElement: {
            parentElement: { id: 'adUnitCode' },
            contentWindow,
          }
        }
      }));

      expect(utag.view.callCount).to.equal(0);
    });

    it('accepts messages from registered ad iframe content windows', async function() {
      const container = document.createElement('div');
      container.id = 'adUnitCode';
      const iframe = document.createElement('iframe');
      container.appendChild(iframe);
      document.body.appendChild(container);
      iframe.contentWindow.utag = utag;

      try {
        registerAdFrames('adUnitCode');

        await messageHandler({
          data: { detail: { type: 'View', name: 'pod_impression', payload: {} } },
          origin: window.location.origin,
          source: iframe.contentWindow,
        });

        expect(utag.view.callCount).to.equal(1);
      } finally {
        document.body.removeChild(container);
      }
    });
  });
});
