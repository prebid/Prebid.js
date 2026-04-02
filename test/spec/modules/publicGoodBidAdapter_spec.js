import { expect } from 'chai';
import sinon from 'sinon';
import { spec, storage } from 'modules/publicGoodBidAdapter.js';
import { hook } from 'src/hook.js';

describe('Public Good Adapter', function () {
  let validBidRequests;

  beforeEach(function () {
    validBidRequests = [
      {
        bidder: 'publicgood',
        params: {
          partnerId: 'prebid-test',
          slotId: 'test'
        },
        placementCode: '/19968336/header-bid-tag-1',
        mediaTypes: {
          banner: {
            sizes: [],
          },
        },
        bidId: '23acc48ad47af5',
        auctionId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729',
      },
    ];
  });

  describe('for requests', function () {
    describe('without partner ID', function () {
      it('rejects the bid', function () {
        const invalidBid = {
          bidder: 'publicgood',
          params: {
            slotId: 'all',
          },
        };
        const isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });
    });

    describe('without slot ID', function () {
      it('rejects the bid', function () {
        const invalidBid = {
          bidder: 'publicgood',
          params: {
            partnerId: 'prebid-test',
          },
        };
        const isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });
    });

    describe('with a valid bid', function () {
      it('accepts the bid', function () {
        const validBid = {
          bidder: 'publicgood',
          params: {
            partnerId: 'prebid-test',
            slotId: 'test'
          },
        };
        const isValid = spec.isBidRequestValid(validBid);

        expect(isValid).to.equal(true);
      });
    });
  });

  describe('for server responses', function () {
    let serverResponse;

    describe('with no body', function () {
      beforeEach(function() {
        serverResponse = {
          body: null,
        };
      });

      it('does not return any bids', function () {
        const bids = spec.interpretResponse(serverResponse, { bidRequest: validBidRequests[0] });

        expect(bids).to.be.length(0);
      });
    });

    describe('with action=hide', function () {
      beforeEach(function() {
        serverResponse = {
          body: {
            action: 'Hide',
          },
        };
      });

      it('does not return any bids', function () {
        const bids = spec.interpretResponse(serverResponse, { bidRequest: validBidRequests[0] });

        expect(bids).to.be.length(0);
      });
    });

    describe('with a valid campaign', function () {
      beforeEach(function() {
        serverResponse = {
          body: {
            "targetData": {
              "deviceType": "desktop",
              "parent_org": "prebid-test",
              "cpm": 3,
              "target_id": "a9b430ab-1f62-46f3-9d3a-1ece821dca61",
              "deviceInfo": {
                "os": {
                  "name": "Mac OS",
                  "version": "10.15.7"
                },
                "engine": {
                  "name": "Blink",
                  "version": "130.0.0.0"
                },
                "browser": {
                  "major": "130",
                  "name": "Chrome",
                  "version": "130.0.0.0"
                },
                "cpu": {},
                "ua": "Mozilla\/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit\/537.36 (KHTML, like Gecko) Chrome\/130.0.0.0 Safari\/537.36",
                "device": {
                  "vendor": "Apple",
                  "model": "Macintosh"
                }
              },
              "widget_type": "card",
              "isInApp": false,
              "partner_id": "prebid-test",
              "countryCode": "US",
              "metroCode": "602",
              "hasReadMore": false,
              "region": "IL",
              "campaign_id": "a9b430ab-1f62-46f3-9d3a-1ece821dca61"
            },
            "action": "Default",
            "url": "https%3A%2F%2Fpublicgood.com%2F",
            "content": {
              "parent_org": "prebid-test",
              "rules_match_info": null,
              "content_id": 20446189,
              "all_matches": [
                {
                  "analysis_tag": "a9b430ab-1f62-46f3-9d3a-1ece821dca61",
                  "guid": "a9b430ab-1f62-46f3-9d3a-1ece821dca61"
                }
              ],
              "is_override": true,
              "cid_match_type": "",
              "target_id": "a9b430ab-1f62-46f3-9d3a-1ece821dca61",
              "url_id": 128113623,
              "title": "Public Good",
              "hide": false,
              "partner_id": "prebid-test",
              "qa_verified": true,
              "tag": "a9b430ab-1f62-46f3-9d3a-1ece821dca61",
              "is_filter": false
            }
          }
        };
      });

      it('returns a complete bid', function () {
        const bids = spec.interpretResponse(serverResponse, { bidRequest: validBidRequests[0] });

        expect(bids).to.be.length(1);
        expect(bids[0].cpm).to.equal(3);
        expect(bids[0].width).to.equal(320);
        expect(bids[0].height).to.equal(470);
        expect(bids[0].currency).to.equal('USD');
        expect(bids[0].netRevenue).to.equal(true);
        expect(bids[0].ad).to.have.string('data-pgs-partner-id="prebid-test"');
      });
    });
  });
});
