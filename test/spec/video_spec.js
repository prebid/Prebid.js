import { isValidVideoBid } from 'src/video.js';
import {hook} from '../../src/hook.js';
import {stubAuctionIndex} from '../helpers/indexStub.js';

describe('video.js', function () {
  before(() => {
    hook.ready();
  });

  it('validates valid instream bids', function () {
    const bid = {
      adId: '456xyz',
      vastUrl: 'http://www.example.com/vastUrl',
      transactionId: 'au'
    };
    const adUnits = [{
      transactionId: 'au',
      mediaTypes: {
        video: {context: 'instream'}
      }
    }];
    const valid = isValidVideoBid(bid, {index: stubAuctionIndex({adUnits})});
    expect(valid).to.equal(true);
  });

  it('catches invalid instream bids', function () {
    const bid = {
      transactionId: 'au'
    };
    const adUnits = [{
      transactionId: 'au',
      mediaTypes: {
        video: {context: 'instream'}
      }
    }];
    const valid = isValidVideoBid(bid, {index: stubAuctionIndex({adUnits})});
    expect(valid).to.equal(false);
  });

  it('catches invalid bids when prebid-cache is disabled', function () {
    const adUnits = [{
      transactionId: 'au',
      bidder: 'vastOnlyVideoBidder',
      mediaTypes: {video: {}},
    }];

    const valid = isValidVideoBid({ transactionId: 'au', vastXml: '<xml>vast</xml>' }, {index: stubAuctionIndex({adUnits})});

    expect(valid).to.equal(false);
  });

  it('validates valid outstream bids', function () {
    const bid = {
      transactionId: 'au',
      renderer: {
        url: 'render.url',
        render: () => true,
      }
    };
    const adUnits = [{
      transactionId: 'au',
      mediaTypes: {
        video: {context: 'outstream'}
      }
    }];
    const valid = isValidVideoBid(bid, {index: stubAuctionIndex({adUnits})});
    expect(valid).to.equal(true);
  });

  it('validates valid outstream bids with a publisher defined renderer', function () {
    const bid = {
      transactionId: 'au',
    };
    const adUnits = [{
      transactionId: 'au',
      mediaTypes: {
        video: {
          context: 'outstream',
        }
      },
      renderer: {
        url: 'render.url',
        render: () => true,
      }
    }];
    const valid = isValidVideoBid(bid, {index: stubAuctionIndex({adUnits})});
    expect(valid).to.equal(true);
  });

  it('catches invalid outstream bids', function () {
    const bid = {
      transactionId: 'au',
    };
    const adUnits = [{
      transactionId: 'au',
      mediaTypes: {
        video: {context: 'outstream'}
      }
    }];
    const valid = isValidVideoBid(bid, {index: stubAuctionIndex({adUnits})});
    expect(valid).to.equal(false);
  });
});
