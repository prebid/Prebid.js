import { expect } from 'chai';
import { parse } from '../../../src/url';
import AdyoulikAdapter from '../../../src/adapters/adyoulike';
import bidmanager from 'src/bidmanager';
import { STATUS } from 'src/constants';

describe('Adyoulike Adapter', () => {
  const endpoint = 'http://hb-api.omnitagjs.com/hb-api/prebid';
  const canonicalUrl = 'http://canonical.url/?t=%26';
  const bidderCode = 'adyoulike';
  const bidRequestWithEmptyPlacement = {
    'bidderCode': 'adyoulike',
    'bids': [
      {
        'bidId': 'bid_id_0',
        'bidder': 'adyoulike',
        'placementCode': 'adunit/hb-0',
        'params': {},
        'sizes': '300x250'
      }
    ],
  };
  const bidRequestWithEmptySizes = {
    'bidderCode': 'adyoulike',
    'bids': [
      {
        'bidId': 'bid_id_0',
        'bidder': 'adyoulike',
        'placementCode': 'adunit/hb-0',
        'params': {
          'placement': 'placement_0'
        }
      }
    ],
  };
  const bidRequestWithSinglePlacement = {
    'bidderCode': 'adyoulike',
    'bids': [
      {
        'bidId': 'bid_id_0',
        'bidder': 'adyoulike',
        'placementCode': 'adunit/hb-0',
        'params': {
          'placement': 'placement_0'
        },
        'sizes': '300x250'
      }
    ],
  };
  const bidRequestMultiPlacements = {
    'bidderCode': 'adyoulike',
    'bids': [
      {
        'bidId': 'bid_id_0',
        'bidder': 'adyoulike',
        'placementCode': 'adunit/hb-0',
        'params': {
          'placement': 'placement_0'
        },
        'sizes': '300x250'
      },
      {
        'bidId': 'bid_id_1',
        'bidder': 'adyoulike',
        'placementCode': 'adunit/hb-1',
        'params': {
          'placement': 'placement_1'
        },
        'sizes': [[300, 600]]
      },
      {
        'bidId': 'bid_id_2',
        'bidder': 'adyoulike',
        'placementCode': 'adunit/hb-2',
        'params': {},
        'sizes': '300x400'
      },
      {
        'bidId': 'bid_id_3',
        'bidder': 'adyoulike',
        'placementCode': 'adunit/hb-3',
        'params': {
          'placement': 'placement_3'
        }
      }
    ],
  };

  const responseWithEmptyPlacement = [
    {
      'Placement': 'placement_0'
    }
  ];
  const responseWithSinglePlacement = [
    {
      'Placement': 'placement_0',
      'Banner': 'placement_0',
      'Price': 0.5
    }
  ];
  const responseWithMultiplePlacements = [
    {
      'Placement': 'placement_0',
      'Banner': 'placement_0',
      'Price': 0.5
    },
    {
      'Placement': 'placement_1',
      'Banner': 'placement_1',
      'Price': 0.6
    }
  ];

  let adapter;

  beforeEach(() => {
    adapter = new AdyoulikAdapter();
  });

  describe('adapter public API', () => {
    const adapter = AdyoulikAdapter.createNew();
    it('createNew', () => {
      expect(adapter.createNew).to.be.a('function');
    });

    it('setBidderCode', () => {
      expect(adapter.setBidderCode).to.be.a('function');
    });
    it('callBids', () => {
      expect(adapter.setBidderCode).to.be.a('function');
    });
  });

  describe('request function', () => {
    let requests;
    let xhr;
    let addBidResponse;
    let canonicalQuery;

    beforeEach(() => {
      requests = [];

      xhr = sinon.useFakeXMLHttpRequest();
      xhr.onCreate = request => requests.push(request);

      addBidResponse = sinon.stub(bidmanager, 'addBidResponse');

      let canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = canonicalUrl;
      canonicalQuery = sinon.stub(window.top.document.head, 'querySelector');
      canonicalQuery.withArgs('link[rel="canonical"][href]').returns(canonical);
    });

    afterEach(() => {
      xhr.restore();
      bidmanager.addBidResponse.restore();
      canonicalQuery.restore();
    });

    it('requires placement request', () => {
      adapter.callBids(bidRequestWithEmptyPlacement);
      expect(requests).to.be.empty;
      expect(addBidResponse.calledOnce).to.equal(false);
    });

    it('requires sizes in request', () => {
      adapter.callBids(bidRequestWithEmptySizes);
      expect(requests).to.be.empty;
      expect(addBidResponse.calledOnce).to.equal(false);
    });

    it('sends bid request to endpoint with single placement', () => {
      adapter.callBids(bidRequestWithSinglePlacement);
      expect(requests[0].url).to.contain(endpoint);
      expect(requests[0].method).to.equal('POST');

      expect(requests[0].url).to.contains('CanonicalUrl=' + encodeURIComponent(canonicalUrl));

      let body = JSON.parse(requests[0].requestBody);
      expect(body.Version).to.equal('0.1');
      expect(body.Placements).deep.equal(['placement_0']);
      expect(body.PageRefreshed).to.equal(false);
    });

    it('sends bid request to endpoint with single placement without canonical', () => {
      canonicalQuery.restore();

      adapter.callBids(bidRequestWithSinglePlacement);
      expect(requests[0].url).to.contain(endpoint);
      expect(requests[0].method).to.equal('POST');

      expect(requests[0].url).to.not.contains('CanonicalUrl=' + encodeURIComponent(canonicalUrl));

      let body = JSON.parse(requests[0].requestBody);
      expect(body.Version).to.equal('0.1');
      expect(body.Placements).deep.equal(['placement_0']);
      expect(body.PageRefreshed).to.equal(false);
    });

    it('sends bid request to endpoint with multiple placements', () => {
      adapter.callBids(bidRequestMultiPlacements);
      expect(requests[0].url).to.contain(endpoint);
      expect(requests[0].method).to.equal('POST');

      expect(requests[0].url).to.contains('CanonicalUrl=' + encodeURIComponent(canonicalUrl));

      let body = JSON.parse(requests[0].requestBody);
      expect(body.Version).to.equal('0.1');
      expect(body.Placements).deep.equal(['placement_0', 'placement_1']);
      expect(body.PageRefreshed).to.equal(false);
    });
  });

  describe('response function', () => {
    let server;
    let addBidResponse;

    beforeEach(() => {
      server = sinon.fakeServer.create();
      addBidResponse = sinon.stub(bidmanager, 'addBidResponse');
    });

    afterEach(() => {
      server.restore();
      bidmanager.addBidResponse.restore();
    });

    it('invalid json', () => {
      server.respondWith('{');
      adapter.callBids(bidRequestWithSinglePlacement);
      server.respond();

      expect(addBidResponse.calledOnce).to.equal(true);
      expect(addBidResponse.args[0]).to.have.lengthOf(2);
      expect(addBidResponse.args[0][1].getStatusCode()).to.equal(STATUS.NO_BID);
      expect(addBidResponse.args[0][1].bidderCode).to.equal(bidderCode);
    });

    it('receive reponse with empty placement', () => {
      server.respondWith(JSON.stringify(responseWithEmptyPlacement));
      adapter.callBids(bidRequestWithSinglePlacement);
      server.respond();

      expect(addBidResponse.calledOnce).to.equal(true);
      expect(addBidResponse.args[0]).to.have.lengthOf(2);
      expect(addBidResponse.args[0][1].getStatusCode()).to.equal(STATUS.NO_BID);
      expect(addBidResponse.args[0][1].bidderCode).to.equal(bidderCode);
    });

    it('receive reponse with single placement', () => {
      server.respondWith(JSON.stringify(responseWithSinglePlacement));
      adapter.callBids(bidRequestWithSinglePlacement);
      server.respond();

      expect(addBidResponse.calledOnce).to.equal(true);
      expect(addBidResponse.args[0]).to.have.lengthOf(2);
      expect(addBidResponse.args[0][1].getStatusCode()).to.equal(STATUS.GOOD);
      expect(addBidResponse.args[0][1].cpm).to.equal(0.5);
      expect(addBidResponse.args[0][1].ad).to.equal('placement_0');
      expect(addBidResponse.args[0][1].width).to.equal(300);
      expect(addBidResponse.args[0][1].height).to.equal(250);
    });

    it('receive reponse with multiple placement', () => {
      server.respondWith(JSON.stringify(responseWithMultiplePlacements));
      adapter.callBids(bidRequestMultiPlacements);
      server.respond();

      expect(addBidResponse.calledTwice).to.equal(true);

      expect(addBidResponse.args[0]).to.have.lengthOf(2);
      expect(addBidResponse.args[0][1].getStatusCode()).to.equal(STATUS.GOOD);
      expect(addBidResponse.args[0][1].bidderCode).to.equal(bidderCode);
      expect(addBidResponse.args[0][1].cpm).to.equal(0.5);
      expect(addBidResponse.args[0][1].ad).to.equal('placement_0');
      expect(addBidResponse.args[0][1].width).to.equal(300);
      expect(addBidResponse.args[0][1].height).to.equal(250);

      expect(addBidResponse.args[1]).to.have.lengthOf(2);
      expect(addBidResponse.args[1][1].getStatusCode()).to.equal(STATUS.GOOD);
      expect(addBidResponse.args[1][1].bidderCode).to.equal(bidderCode);
      expect(addBidResponse.args[1][1].cpm).to.equal(0.6);
      expect(addBidResponse.args[1][1].ad).to.equal('placement_1');
      expect(addBidResponse.args[1][1].width).to.equal(300);
      expect(addBidResponse.args[1][1].height).to.equal(600);
    });

    it('receive reponse with invalid placement number', () => {
      server.respondWith(JSON.stringify(responseWithSinglePlacement));
      adapter.callBids(bidRequestMultiPlacements);
      server.respond();

      expect(addBidResponse.calledTwice).to.equal(true);

      expect(addBidResponse.args[0]).to.have.lengthOf(2);
      expect(addBidResponse.args[0][1].getStatusCode()).to.equal(STATUS.GOOD);
      expect(addBidResponse.args[0][1].bidderCode).to.equal(bidderCode);
      expect(addBidResponse.args[0][1].cpm).to.equal(0.5);
      expect(addBidResponse.args[0][1].ad).to.equal('placement_0');
      expect(addBidResponse.args[0][1].width).to.equal(300);
      expect(addBidResponse.args[0][1].height).to.equal(250);

      expect(addBidResponse.args[1]).to.have.lengthOf(2);
      expect(addBidResponse.args[1][1].getStatusCode()).to.equal(STATUS.NO_BID);
    });
  });
});
