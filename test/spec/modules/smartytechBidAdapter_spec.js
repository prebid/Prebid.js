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
    const bidFixture = {
      params: {
        use_id: 13144375
      }
    }

    expect(spec.isBidRequestValid(bidFixture)).to.be.false
  });
  it('Valid bid request. Should return true', function () {
    const bidFixture = {
      params: {
        endpointId: 13144375
      }
    }
    expect(spec.isBidRequestValid(bidFixture)).to.be.true
  });

  it('Invalid bid request. Check video block', function () {
    const bidFixture = {
      params: {
        endpointId: 1
      },
      mediaTypes: {
        video: {}
      }
    }
    expect(spec.isBidRequestValid(bidFixture)).to.be.false
  });

  it('Invalid bid request. Check playerSize', function () {
    const bidFixture = {
      params: {
        endpointId: 1
      },
      mediaTypes: {
        video: {
          playerSize: '300x250'
        }
      }
    }
    expect(spec.isBidRequestValid(bidFixture)).to.be.false
  });

  it('Invalid bid request. Check context', function () {
    const bidFixture = {
      params: {
        endpointId: 1
      },
      mediaTypes: {
        video: {
          playerSize: [300, 250]
        }
      }
    }
    expect(spec.isBidRequestValid(bidFixture)).to.be.false
  });

  it('Valid bid request. valid video bid', function () {
    const bidFixture = {
      params: {
        endpointId: 1
      },
      mediaTypes: {
        video: {
          playerSize: [300, 250],
          context: 'instream'
        }
      }
    }
    expect(spec.isBidRequestValid(bidFixture)).to.be.true
  });

  it('Invalid bid request. Check banner block', function () {
    const bidFixture = {
      params: {
        endpointId: 1
      },
      mediaTypes: {
        banner: {}
      }
    }
    expect(spec.isBidRequestValid(bidFixture)).to.be.false
  });

  it('Invalid bid request. Check banner sizes', function () {
    const bidFixture = {
      params: {
        endpointId: 1
      },
      mediaTypes: {
        banner: {
          sizes: '300x250'
        }
      }
    }
    expect(spec.isBidRequestValid(bidFixture)).to.be.false
  });

  it('Valid bid request. valid banner bid', function () {
    const bidFixture = {
      params: {
        endpointId: 1
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      }
    }
    expect(spec.isBidRequestValid(bidFixture)).to.be.true
  });
});

function mockRandomSizeArray(len) {
  return Array.apply(null, {length: len}).map(i => {
    return [Math.floor(Math.random() * 800), Math.floor(Math.random() * 800)]
  });
}

function mockBidRequestListData(mediaType, size, customSizes) {
  return Array.apply(null, {length: size}).map((i, index) => {
    const id = Math.floor(Math.random() * 800) * (index + 1);
    let mediaTypes;
    const params = {
      endpointId: id
    }

    if (mediaType === 'video') {
      mediaTypes = {
        video: {
          playerSize: mockRandomSizeArray(1),
          context: 'instream'
        },
      }
    } else {
      mediaTypes = {
        banner: {
          sizes: mockRandomSizeArray(index + 1)
        }
      }
    }

    if (customSizes === undefined || customSizes.length > 0) {
      params.sizes = customSizes
    }

    return {
      adUnitCode: `adUnitCode-${id}`,
      mediaTypes: mediaTypes,
      bidId: `bidId-${id}`,
      params: params
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
  const data = {}
  requestData.data.forEach((request, index) => {
    const rndIndex = Math.floor(Math.random() * 800);
    let width, height, mediaType;
    if (request.video !== undefined) {
      width = request.video.playerSize[0][0];
      height = request.video.playerSize[0][1];
      mediaType = 'video';
    } else {
      width = request.banner.sizes[0][0];
      height = request.banner.sizes[0][1];
      mediaType = 'banner';
    }

    data[request.adUnitCode] = {
      ad: `ad-${rndIndex}`,
      width: width,
      height: height,
      creativeId: `creative-id-${index}`,
      cpm: Math.floor(Math.random() * 100),
      currency: `UAH-${rndIndex}`,
      mediaType: mediaType,
      meta: {
        primaryCatId: 'IAB2-2',
        secondaryCatIds: ['IAB2-14', 'IAB2-6']
      }
    };
  });
  return {
    body: data
  }
};

describe('SmartyTechDSPAdapter: buildRequests', () => {
  let mockBidRequest;
  let mockReferer;
  beforeEach(() => {
    mockBidRequest = mockBidRequestListData('banner', 8, []);
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
      expect(request.banner).to.be.equal(mockBidRequest[index].mediaTypes.banner);
      expect(request.bidId).to.be.equal(mockBidRequest[index].bidId);
      expect(request.endpointId).to.be.equal(mockBidRequest[index].params.endpointId);
      expect(request.referer).to.be.equal(mockReferer.refererInfo.page);
    })
  });
});

describe('SmartyTechDSPAdapter: buildRequests banner custom size', () => {
  let mockBidRequest;
  let mockReferer;
  beforeEach(() => {
    mockBidRequest = mockBidRequestListData('banner', 8, [[300, 600]]);
    mockReferer = mockRefererData();
  });

  it('correct request data', () => {
    const data = spec.buildRequests(mockBidRequest, mockReferer).data;
    data.forEach((request, index) => {
      expect(request.banner.sizes).to.be.equal(mockBidRequest[index].params.sizes);
    })
  });
});

describe('SmartyTechDSPAdapter: buildRequests video custom size', () => {
  let mockBidRequest;
  let mockReferer;
  beforeEach(() => {
    mockBidRequest = mockBidRequestListData('video', 8, [[300, 300], [250, 250]]);
    mockReferer = mockRefererData();
  });

  it('correct request data', () => {
    const data = spec.buildRequests(mockBidRequest, mockReferer).data;
    data.forEach((request, index) => {
      expect(request.video.sizes).to.be.equal(mockBidRequest[index].params.sizes);
    })
  });
});

describe('SmartyTechDSPAdapter: interpretResponse', () => {
  let mockBidRequest;
  let mockReferer;
  let request;
  let mockResponse;
  beforeEach(() => {
    const brData = mockBidRequestListData('banner', 2, []);
    mockReferer = mockRefererData();
    request = spec.buildRequests(brData, mockReferer);
    mockBidRequest = {
      data: brData
    }
    mockResponse = mockResponseData(request);
  });

  it('interpretResponse: empty data request', () => {
    delete mockResponse['body']
    const data = spec.interpretResponse(mockResponse, mockBidRequest);
    expect(data.length).to.be.equal(0);
  });

  it('interpretResponse: response data and convert data arrays has same length', () => {
    const keys = Object.keys(mockResponse.body);
    const data = spec.interpretResponse(mockResponse, mockBidRequest);
    expect(data.length).to.be.equal(keys.length);
  });

  it('interpretResponse: convert to correct data', () => {
    const keys = Object.keys(mockResponse.body);
    const data = spec.interpretResponse(mockResponse, mockBidRequest);

    data.forEach((responseItem, index) => {
      expect(responseItem.ad).to.be.equal(mockResponse.body[keys[index]].ad);
      expect(responseItem.cpm).to.be.equal(mockResponse.body[keys[index]].cpm);
      expect(responseItem.creativeId).to.be.equal(mockResponse.body[keys[index]].creativeId);
      expect(responseItem.currency).to.be.equal(mockResponse.body[keys[index]].currency);
      expect(responseItem.netRevenue).to.be.true;
      expect(responseItem.ttl).to.be.equal(60);
      expect(responseItem.requestId).to.be.equal(mockBidRequest.data[index].bidId);
      expect(responseItem.width).to.be.equal(mockResponse.body[keys[index]].width);
      expect(responseItem.height).to.be.equal(mockResponse.body[keys[index]].height);
      expect(responseItem.mediaType).to.be.equal(mockResponse.body[keys[index]].mediaType);
    });
  });
});

describe('SmartyTechDSPAdapter: interpretResponse video', () => {
  let mockBidRequest;
  let mockReferer;
  let request;
  let mockResponse;
  beforeEach(() => {
    const brData = mockBidRequestListData('video', 2, []);
    mockReferer = mockRefererData();
    request = spec.buildRequests(brData, mockReferer);
    mockBidRequest = {
      data: brData
    }
    mockResponse = mockResponseData(request);
  });

  it('interpretResponse: convert to correct data', () => {
    const keys = Object.keys(mockResponse.body);
    const data = spec.interpretResponse(mockResponse, mockBidRequest);

    data.forEach((responseItem, index) => {
      expect(responseItem.ad).to.be.equal(mockResponse.body[keys[index]].ad);
      expect(responseItem.cpm).to.be.equal(mockResponse.body[keys[index]].cpm);
      expect(responseItem.creativeId).to.be.equal(mockResponse.body[keys[index]].creativeId);
      expect(responseItem.currency).to.be.equal(mockResponse.body[keys[index]].currency);
      expect(responseItem.netRevenue).to.be.true;
      expect(responseItem.ttl).to.be.equal(60);
      expect(responseItem.requestId).to.be.equal(mockBidRequest.data[index].bidId);
      expect(responseItem.width).to.be.equal(mockResponse.body[keys[index]].width);
      expect(responseItem.height).to.be.equal(mockResponse.body[keys[index]].height);
      expect(responseItem.mediaType).to.be.equal(mockResponse.body[keys[index]].mediaType);
      expect(responseItem.vastXml).to.be.equal(mockResponse.body[keys[index]].ad);
    });
  });
});
