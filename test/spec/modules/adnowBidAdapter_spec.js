import { expect } from 'chai';
import { spec } from 'modules/adnowBidAdapter.js';

describe.only('adnowBidAdapterTests', function () {
  it('isBidRequestValid', function () {
    it('Should return true', function() {
      expect(spec.isBidRequestValid({
        bidder: 'adnow',
        params: {
          codeId: 12345
        }
      })).to.equal(true);
    });

    it('Should return false', function() {
      expect(spec.isBidRequestValid({
        bidder: 'adnow',
        params: {}
      })).to.equal(false);
    });
  });

  it('buildRequests', function() {
    const bidRequestData = [{
      bidId: 'bid12345',
      params: {
        codeId: 12345
      }
    }];

    const req = spec.buildRequests(bidRequestData);
    const reqData = req[0].data;

    expect(reqData)
      .to.match(/Id=12345/)
      .to.match(/mediaType=native/)
      .to.match(/out=prebid/)
      .to.match(/requestid=bid12345/)
      .to.match(/d_user_agent=.+/);
  });

  it.only('interpretResponse', function() {
    const request = {
      bidRequest: {
        bidId: 'bid12345'
      }
    };

    const response = {
      title: 'Title',
      body: 'Body',
      sponsoredBy: 'AdNow',
      clickUrl: '//click.url',
      image: {
        url: '//img.url',
        height: 200,
        width: 200
      }
    };

    const bids = spec.interpretResponse({ body: response }, request);
    const bid = bids[0];

    expect(bid).to.have.property('requestId');
    expect(bid).to.have.property('title');
    expect(bid).to.have.property('body');
    expect(bid).to.have.property('clickUrl');
    expect(bid).to.have.property('image');
  });
});
