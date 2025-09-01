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

    if (mediaType == 'video') {
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

function mockBidderRequestWithConsents() {
  return {
    refererInfo: {
      page: 'https://some-test.page'
    },
    gdprConsent: {
      gdprApplies: true,
      consentString: 'COzTVhaOzTVhaGvAAAENAiCIAP_AAH_AAAAAAEEUACCKAAA',
      addtlConsent: '1~1.35.41.101'
    },
    uspConsent: '1YNN',
    gppConsent: {
      gppString: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
      applicableSections: [2, 6]
    }
  }
}

function mockBidRequestWithUserIds(mediaType, size, customSizes) {
  const requests = mockBidRequestListData(mediaType, size, customSizes);
  return requests.map(request => ({
    ...request,
    userIdAsEids: [
      {
        source: 'unifiedid.com',
        uids: [{
          id: 'test-unified-id',
          atype: 1
        }]
      },
      {
        source: 'pubcid.org',
        uids: [{
          id: 'test-pubcid',
          atype: 1
        }]
      }
    ]
  }));
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
    const requests = spec.buildRequests(mockBidRequest, mockReferer);
    expect(requests).to.be.an('array');
    expect(requests.length).to.be.greaterThan(0);
  });
  it('correct request URL', () => {
    const requests = spec.buildRequests(mockBidRequest, mockReferer);
    requests.forEach(request => {
      expect(request.url).to.be.equal(`${ENDPOINT_PROTOCOL}://${ENDPOINT_DOMAIN}${ENDPOINT_PATH}`);
    });
  });
  it('correct request method', () => {
    const requests = spec.buildRequests(mockBidRequest, mockReferer);
    requests.forEach(request => {
      expect(request.method).to.be.equal('POST');
    });
  });
  it('correct request data', () => {
    const responses = spec.buildRequests(mockBidRequest, mockReferer);
    // Flatten all data from all chunks for testing
    const allData = responses.flatMap(response => response.data);
    allData.forEach((request, index) => {
      expect(request.adUnitCode).to.be.equal(mockBidRequest[index].adUnitCode);
      expect(request.banner).to.be.equal(mockBidRequest[index].mediaTypes.banner);
      expect(request.bidId).to.be.equal(mockBidRequest[index].bidId);
      expect(request.endpointId).to.be.equal(mockBidRequest[index].params.endpointId);
      expect(request.referer).to.be.equal(mockReferer.refererInfo.page);
    });
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
    const responses = spec.buildRequests(mockBidRequest, mockReferer);
    const allData = responses.flatMap(response => response.data);
    allData.forEach((request, index) => {
      expect(request.banner.sizes).to.be.equal(mockBidRequest[index].params.sizes);
    });
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
    const responses = spec.buildRequests(mockBidRequest, mockReferer);
    const allData = responses.flatMap(response => response.data);
    allData.forEach((request, index) => {
      expect(request.video.sizes).to.be.equal(mockBidRequest[index].params.sizes);
    });
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
    const requests = spec.buildRequests(brData, mockReferer);
    request = requests[0]; // Use first request for testing
    mockBidRequest = {
      data: request.data
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
    const requests = spec.buildRequests(brData, mockReferer);
    request = requests[0]; // Use first request for testing
    mockBidRequest = {
      data: request.data
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

describe('SmartyTechDSPAdapter: buildRequests with user IDs', () => {
  let mockBidRequest;
  let mockReferer;
  beforeEach(() => {
    mockBidRequest = mockBidRequestWithUserIds('banner', 2, []);
    mockReferer = mockRefererData();
  });

  it('should include userIds when available', () => {
    const responses = spec.buildRequests(mockBidRequest, mockReferer);
    const allData = responses.flatMap(response => response.data);

    allData.forEach((request, index) => {
      expect(request).to.have.property('userIds');
      expect(request.userIds).to.deep.equal(mockBidRequest[index].userIdAsEids);
    });
  });

  it('should not include userIds when not available', () => {
    const bidRequestWithoutUserIds = mockBidRequestListData('banner', 2, []);
    const responses = spec.buildRequests(bidRequestWithoutUserIds, mockReferer);
    const allData = responses.flatMap(response => response.data);

    allData.forEach((request) => {
      expect(request).to.not.have.property('userIds');
    });
  });

  it('should not include userIds when userIdAsEids is undefined', () => {
    const bidRequestWithUndefinedUserIds = mockBidRequestListData('banner', 2, []).map(req => {
      const {userIdAsEids, ...requestWithoutUserIds} = req;
      return requestWithoutUserIds;
    });
    const responses = spec.buildRequests(bidRequestWithUndefinedUserIds, mockReferer);
    const allData = responses.flatMap(response => response.data);

    allData.forEach((request) => {
      expect(request).to.not.have.property('userIds');
    });
  });

  it('should not include userIds when userIdAsEids is empty array', () => {
    const bidRequestWithEmptyUserIds = mockBidRequestListData('banner', 2, []).map(req => ({
      ...req,
      userIdAsEids: []
    }));
    const responses = spec.buildRequests(bidRequestWithEmptyUserIds, mockReferer);
    const allData = responses.flatMap(response => response.data);

    allData.forEach((request) => {
      expect(request).to.not.have.property('userIds');
    });
  });
});

describe('SmartyTechDSPAdapter: buildRequests with consent data', () => {
  let mockBidRequest;
  let mockBidderRequest;
  beforeEach(() => {
    mockBidRequest = mockBidRequestListData('banner', 2, []);
    mockBidderRequest = mockBidderRequestWithConsents();
  });

  it('should include GDPR consent when available', () => {
    const responses = spec.buildRequests(mockBidRequest, mockBidderRequest);
    const allData = responses.flatMap(response => response.data);

    allData.forEach((request) => {
      expect(request).to.have.property('gdprConsent');
      expect(request.gdprConsent.gdprApplies).to.be.true;
      expect(request.gdprConsent.consentString).to.equal('COzTVhaOzTVhaGvAAAENAiCIAP_AAH_AAAAAAEEUACCKAAA');
      expect(request.gdprConsent.addtlConsent).to.equal('1~1.35.41.101');
    });
  });

  it('should include USP consent when available', () => {
    const responses = spec.buildRequests(mockBidRequest, mockBidderRequest);
    const allData = responses.flatMap(response => response.data);

    allData.forEach((request) => {
      expect(request).to.have.property('uspConsent');
      expect(request.uspConsent).to.equal('1YNN');
    });
  });

  it('should include GPP consent when available', () => {
    const responses = spec.buildRequests(mockBidRequest, mockBidderRequest);
    const allData = responses.flatMap(response => response.data);

    allData.forEach((request) => {
      expect(request).to.have.property('gppConsent');
      expect(request.gppConsent.gppString).to.equal('DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA');
      expect(request.gppConsent.applicableSections).to.deep.equal([2, 6]);
    });
  });

  it('should not include consent data when not available', () => {
    const mockReferer = mockRefererData();
    const responses = spec.buildRequests(mockBidRequest, mockReferer);
    const allData = responses.flatMap(response => response.data);

    allData.forEach((request) => {
      expect(request).to.not.have.property('gdprConsent');
      expect(request).to.not.have.property('uspConsent');
      expect(request).to.not.have.property('gppConsent');
    });
  });
});

describe('SmartyTechDSPAdapter: buildRequests chunking functionality', () => {
  let mockBidRequest;
  let mockReferer;

  beforeEach(() => {
    mockReferer = mockRefererData();
  });

  it('should split requests into chunks with default size of 10', () => {
    mockBidRequest = mockBidRequestListData('banner', 25, []);
    const responses = spec.buildRequests(mockBidRequest, mockReferer);

    expect(responses).to.be.an('array');
    expect(responses.length).to.equal(3); // 25 requests split into chunks of 10: [10, 10, 5]

    // Verify total request count remains the same
    const totalRequests = responses.reduce((sum, response) => sum + response.data.length, 0);
    expect(totalRequests).to.equal(25);
  });

  it('should handle single request correctly', () => {
    mockBidRequest = mockBidRequestListData('banner', 1, []);
    const responses = spec.buildRequests(mockBidRequest, mockReferer);

    expect(responses).to.be.an('array');
    expect(responses.length).to.equal(1);
    expect(responses[0].data.length).to.equal(1);
  });

  it('should maintain request properties in all chunks', () => {
    mockBidRequest = mockBidRequestListData('banner', 15, []);
    const responses = spec.buildRequests(mockBidRequest, mockReferer);

    responses.forEach(response => {
      expect(response.method).to.equal('POST');
      expect(response.url).to.equal(`${ENDPOINT_PROTOCOL}://${ENDPOINT_DOMAIN}${ENDPOINT_PATH}`);
      expect(response.data).to.be.an('array');
      expect(response.data.length).to.be.greaterThan(0);
    });
  });

  it('should preserve bid request data integrity across chunks', () => {
    mockBidRequest = mockBidRequestListData('banner', 15, []);
    const responses = spec.buildRequests(mockBidRequest, mockReferer);
    const allData = responses.flatMap(response => response.data);

    allData.forEach((request, index) => {
      expect(request.adUnitCode).to.equal(mockBidRequest[index].adUnitCode);
      expect(request.bidId).to.equal(mockBidRequest[index].bidId);
      expect(request.endpointId).to.equal(mockBidRequest[index].params.endpointId);
    });
  });
});
