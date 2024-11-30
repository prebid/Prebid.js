import { spec } from 'modules/rediadsBidAdapter';
import { deepSetValue } from 'src/utils.js';
import { config } from 'src/config.js';
import { expect } from 'chai';
import sinon from 'sinon';

// Test for isBidRequestValid
describe('isBidRequestValid', function() {
  it('should return true if accountID is present', function() {
    const bidRequest = {
      params: {
        accountID: '12345',
      },
    };
    const result = spec.isBidRequestValid(bidRequest);
    expect(result).to.be.true;
  });

  it('should return false if accountID is missing', function() {
    const bidRequest = {
      params: {},
    };
    const result = spec.isBidRequestValid(bidRequest);
    expect(result).to.be.false;
  });
});

// Test for buildRequests
describe('buildRequests', function() {
  it('should build a valid request with account_id and test flag', function() {
    const bidRequests = [{
      params: {
        accountID: '12345',
      },
    }];
    const bidderRequest = {}; // Mock bidderRequest if needed

    // Mock config.getConfig('content') to return a valid value
    sinon.stub(config, 'getConfig').returns('content_value');

    const requests = spec.buildRequests(bidRequests, bidderRequest);

    const data = requests[0].data;
    expect(data).to.have.property('test', 1);
    expect(data).to.have.property('ext');
    expect(data.ext).to.have.property('rediads.account_id', '12345');
    expect(data.site).to.have.property('content', 'content_value');
    expect(requests[0].url).to.equal('https://stagingbidding.rediads.com/openrtb2/auction');

    // Restore the stub after the test
    sinon.restore();
  });
});

// Test for interpretResponse
describe('interpretResponse', function() {
  it('should correctly interpret the OpenRTB response and return bids', function() {
    const mockResponse = {
      body: {
        bids: [
          {
            requestId: '123',
            cpm: 1.5,
            ad: '<html></html>',
            mediaType: 'banner',
            currency: 'USD',
            ttl: 300,
          },
        ],
      },
    };

    const request = {
      data: {
        test: 1,
        ext: {
          rediads: {
            account_id: '12345',
          },
        },
      },
    };

    const bids = spec.interpretResponse(mockResponse, request);

    expect(bids).to.have.lengthOf(1);
    expect(bids[0]).to.have.property('requestId', '123');
    expect(bids[0]).to.have.property('cpm', 1.5);
    expect(bids[0]).to.have.property('ad', '<html></html>');
    expect(bids[0]).to.have.property('mediaType', 'banner');
  });
});

// Test for Default Values (Currency, Net Revenue)
describe('Default Values', function() {
  it('should set the default currency as USD', function() {
    const bidRequest = {
      params: {
        accountID: '12345',
      },
    };
    const request = spec.buildRequests([bidRequest], {});
    expect(request[0].data.ext.rediads.account_id).to.equal('12345');
    expect(request[0].data.ext.rediads.currency).to.equal('USD');
  });

  it('should set netRevenue to true', function() {
    const bidRequest = {
      params: {
        accountID: '12345',
      },
    };
    const request = spec.buildRequests([bidRequest], {});
    expect(request[0].data.ext.rediads.netRevenue).to.be.true;
  });
});

// Test for Media Type Handling
describe('Media Type Handling', function() {
  it('should assign "banner" as mediaType by default', function() {
    const bid = { adm: '<html></html>', mediaType: 'banner' };
    const result = spec.converter.bidResponse(() => {}, bid, {});
    expect(result.mediaType).to.equal('banner');
    expect(result.mtype).to.equal(1); // BANNER = 1
  });

  it('should assign "video" when video object exists', function() {
    const bid = { video: {}, mediaType: 'video' };
    const result = spec.converter.bidResponse(() => {}, bid, {});
    expect(result.mediaType).to.equal('video');
    expect(result.mtype).to.equal(2); // VIDEO = 2
  });

  it('should assign "native" when native object exists', function() {
    const bid = { native: {}, mediaType: 'native' };
    const result = spec.converter.bidResponse(() => {}, bid, {});
    expect(result.mediaType).to.equal('native');
    expect(result.mtype).to.equal(4); // NATIVE = 4
  });
});
