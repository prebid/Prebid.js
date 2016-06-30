import appnexusAnalytics from 'src/adapters/analytics/appnexus';
import { assert } from 'chai';
import { getBidRequestedPayload } from 'test/fixtures/fixtures';

const spyEnqueue = sinon.spy(appnexusAnalytics, 'enqueue');
const spyTrack = sinon.spy(appnexusAnalytics, 'track');

const bidRequestedPayload = getBidRequestedPayload();

// describe(`
// FEATURE: AppNexus Prebid Analytics Adapter (APA)
//   STORY: As a publisher I use APA to collect data for auction events\n`, ()=> {
//     describe(`SCENARIO: Bids are received from bidder
//       GIVEN: A publisher page requests bids
//       WHEN: The bidRequested event fires`, () => {
//         appnexusAnalytics.enqueue('bidRequested', bidRequestedPayload);
//         it(`THEN: APA enqueue is called with event payload
//         AND: APA track does not get called`, () => {
//           assert.ok(spyEnqueue.calledWith('bidRequested'));
//           assert.deepEqual(spyEnqueue.args[0][1], bidRequestedPayload);
//           assert.ok(!spyTrack.called);
//         });
//       });
//   });
