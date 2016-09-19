// Copyright 2016 AOL Platforms.

import { assert } from 'chai';
import events from '../../../../../src/events';
import CONSTANTS from '../../../../../src/constants.json';
import { getBidResponses, getRequestedBids, getAdUnits } from '../../../../fixtures/fixturesAnalytics';

const aolAnalytics = require('../../../../../src/adapters/analytics/aol').default;
const AUCTION_END = CONSTANTS.EVENTS.AUCTION_END;
const BID_WON = CONSTANTS.EVENTS.BID_WON;

describe(`
  FEATURE: AOL Prebid Analytics Adapter
  STORY: As a publisher I use AOL Analytics to collect data for auction and win events`, () => {

    aolAnalytics.enableAnalytics({});

    describe(`
      SCENARIO: The client side auction is performed to select the winning bid.
      GIVEN: A publisher page requests bids`, () => {

        describe(`WHEN: The auction is complete by all bids being available or by timeout`, () => {

          let spyTrack = sinon.spy(aolAnalytics, 'track');
          let spyReportEvent = sinon.spy(aolAnalytics, 'reportEvent');
          let spyBuildEndpoint = sinon.spy(aolAnalytics, 'buildEndpoint');
          $$PREBID_GLOBAL$$._bidsReceived = getBidResponses();
          $$PREBID_GLOBAL$$._bidsRequested = getRequestedBids();
          $$PREBID_GLOBAL$$.adUnits = getAdUnits();
          let url = 'foobar';

          events.emit(AUCTION_END);

          it(`THEN: AOL Analytics track is called for the auction complete event`, () => {
            assert.ok(spyTrack.calledWith({
              eventType: AUCTION_END,
              args: undefined
            }));
          });

          it(`THEN: AOL Analytics buildEndpoint is called`, () => {
            assert.ok(spyBuildEndpoint.called);
          });

          it(`THEN: AOL Analytics reportEvent is called to send the auction event with the right URL
            containing the right properties`, () => {
              assert.ok(spyReportEvent.called);
              //TODO (marcio.pereira) deal with generated id and timestamps
              //assert.equal(spyReportEvent.args[0][0], url);
            });

          $$PREBID_GLOBAL$$._bidsReceived = [];
          $$PREBID_GLOBAL$$._bidsRequested = [];
          $$PREBID_GLOBAL$$.adUnits = [];
          aolAnalytics.track.restore();
          aolAnalytics.reportEvent.restore();
          aolAnalytics.buildEndpoint.restore();
        });
      });

    describe(`
      SCENARIO: The Ad Server side auction is performed, bid is won and the ad is rendedered.
      GIVEN: A publisher send the targeting values to the Ad Server.`, () => {

        let spyTrack = sinon.spy(aolAnalytics, 'track');
        let spyReportEvent = sinon.spy(aolAnalytics, 'reportEvent');
        let spyBuildEndpoint = sinon.spy(aolAnalytics, 'buildEndpoint');
        let bidWon = getBidResponses()[2];
        let url = 'foobar';

        events.emit(BID_WON, bidWon);

        it(`THEN: AOL Analytics track is called for the bid won event`, () => {
          assert.ok(spyTrack.calledWith({ eventType: BID_WON, args: bidWon }));
        });

        it(`THEN: AOL Analytics buildEndpoint is called`, () => {
          assert.ok(spyBuildEndpoint.called);
        });

        it(`THEN: AOL Analytics reportEvent is called to send the auction event with the right URL
            containing the right properties`, () => {
              assert.ok(spyReportEvent.called);
              //TODO (marcio.pereira) deal with generated id and timestamps
              //assert.equal(spyReportEvent.args[0][0], url);
            });

        aolAnalytics.track.restore();
        aolAnalytics.reportEvent.restore();
        aolAnalytics.buildEndpoint.restore();
      });
  });
