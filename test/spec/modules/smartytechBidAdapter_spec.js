import {expect} from 'chai';
import {spec, ENDPOINT_PROTOCOL, ENDPOINT_DOMAIN, ENDPOINT_PATH} from 'modules/smartytechBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory.js';

const BIDDER_CODE = 'smartytech';

describe('SmartyTechDSPAdapter: inherited functions', function () {
  let adapter;
  beforeEach(() => {
    adapter = newBidder(spec);
  });
  it('exists and is a function', function () {
    expect(adapter.callBids).to.be.exist.and.to.be.a('function');
  });
  it(`bidder code is ${BIDDER_CODE}`, function () {
    expect(spec.code).to.be.equal(BIDDER_CODE);
  })
});

describe('SmartyTechDSPAdapter: isBidRequestValid', function () {
  it('Invalid bid request. Should return false', function () {
    const invalidBidFixture = {
      params: {
        use_id: 13144375
      }
    }
    expect(spec.isBidRequestValid(invalidBidFixture)).to.be.false
  });
  it('Valid bid request. Should return true', function () {
    const validBidFixture = {
      params: {
        endpointId: 13144375
      }
    }
    expect(spec.isBidRequestValid(validBidFixture)).to.be.true
  });
});

function mockRandomSizeArray(length) {
  return new Array(length).map(i => {
    return [Math.floor(Math.random() * 800), Math.floor(Math.random() * 800)]
  });
}

function mockBidRequestListData(size) {
  return new Array(Math.floor(Math.random() * size)).map((i, index) => {
    const id = Math.floor(Math.random() * 800) * index;
    return {
      adUnitCode: `adUnitCode-${id}`,
      sizes: mockRandomSizeArray(index + 1),
      bidId: `bidId-${id}`,
      params: {
        endpointId: id
      }
    }
  });
}

function mockRefererData() {
  return {
    refererInfo: {
      page: 'https://some-test.page'
    }
  }
}

function mockResponseData(requestData) {
  const data = requestData.data.map((request, index) => {
    const sizeArrayIndex = Math.floor(Math.random() * (request.size.length() - 1));
    const rndIndex = Math.floor(Math.random() * 800);
    return {
      [request.adUnitCode]: {
        ad: `ad-${rndIndex}`,
        width: request.size[sizeArrayIndex][0],
        height: request.size[sizeArrayIndex][1],
        creativeId: `creative-id-${index}`,
        cpm: Math.floor(Math.random() * 100),
        currency: `UAH-${rndIndex}`
      }
    }
  });
  return {
    body: data
  }
}

describe('SmartyTechDSPAdapter: buildRequests', () => {
  let mockBidRequest;
  let mockReferer;
  beforeEach(() => {
    mockBidRequest = mockBidRequestListData(8);
    mockReferer = mockRefererData();
  });
  it('has return data', () => {
    const request = spec.buildRequests(mockBidRequest, mockReferer);
    expect(request).not.null;
  });
  it('correct request URL', () => {
    const request = spec.buildRequests(mockBidRequest, mockReferer);
    expect(request.url).to.be.equal(`${ENDPOINT_PROTOCOL}://${ENDPOINT_DOMAIN}${ENDPOINT_PATH}`)
  });
  it('correct request method', () => {
    const request = spec.buildRequests(mockBidRequest, mockReferer);
    expect(request.method).to.be.equal(`POST`)
  });
  it('correct request data', () => {
    const data = spec.buildRequests(mockBidRequest, mockReferer).data;
    data.forEach((request, index) => {
      expect(request.adUnitCode).to.be.equal(mockBidRequest[index].adUnitCode);
      expect(request.sizes).to.be.equal(mockBidRequest[index].sizes);
      expect(request.bidId).to.be.equal(mockBidRequest[index].bidId);
      expect(request.endpointId).to.be.equal(mockBidRequest[index].params.endpointId);
      expect(request.referer).to.be.equal(mockReferer.refererInfo.page);
    })
  });
});

describe('SmartyTechDSPAdapter: interpretResponse', () => {
  let mockBidRequest;
  let mockReferer;
  let request;
  let mockResponse;
  beforeEach(() => {
    const brData = mockBidRequestListData(2);
    mockReferer = mockRefererData();
    request = spec.buildRequests(brData, mockReferer);
    mockBidRequest = {
      data: brData
    }
    mockResponse = mockResponseData(request);
  });

  it('interpretResponse: does not return data with out ads', () => {
    const keys = Object.keys(mockResponse.body);
    for (let key in keys) {
      mockResponse.body[key].ad = undefined;
    }
    const data = spec.interpretResponse(mockResponse, mockBidRequest);
    expect(data.length).to.be.equal(0);
  });

  it('interpretResponse: response data ans convert data arrays has same length', () => {
    const keys = Object.keys(mockResponse.body);
    const data = spec.interpretResponse(mockResponse, mockBidRequest);
    expect(data.length).to.be.equal(keys.length);
  });

  it('interpretResponse: convert to correct data', () => {
    const data = spec.interpretResponse(mockResponse, mockBidRequest);
    const responseBody = mockResponse.body;
    const keys = Object.keys(responseBody);
    data.forEach((responseItem, index) => {
      expect(responseItem.ad).to.be.equal(responseBody[keys[index]].ad);
      expect(responseItem.cpm).to.be.equal(responseBody[keys[index]].cpm);
      expect(responseItem.creativeId).to.be.equal(responseBody[keys[index]].creativeId);
      expect(responseItem.currency).to.be.equal(responseBody[keys[index]].currency);
      expect(responseItem.netRevenue).to.be.true;
      expect(responseItem.ttl).to.be.equal(60);
      expect(responseItem.requestId).to.be.equal(mockBidRequest.data[index].bidId);
      const sizeList = responseBody[keys[index]].size.filter(s => {
        return s[0] === responseItem.width && s[1] === responseItem.height
      });
      expect(sizeList.length).to.be.equal(1);
    });
  });
})
