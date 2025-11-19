import {expect} from 'chai';
import {spec, ENDPOINT_PROTOCOL, ENDPOINT_DOMAIN, ENDPOINT_PATH, getAliasUserId, storage} from 'modules/smartytechBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';
import sinon from 'sinon';

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
    uspConsent: '1YNN'
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
    const request = spec.buildRequests(mockBidRequest, mockReferer);
    expect(request).not.null;
  });
  it('correct request URL', () => {
    const request = spec.buildRequests(mockBidRequest, mockReferer);
    request.forEach(req => {
      expect(req.url).to.be.equal(`${ENDPOINT_PROTOCOL}://${ENDPOINT_DOMAIN}${ENDPOINT_PATH}`)
    });
  });
  it('correct request method', () => {
    const request = spec.buildRequests(mockBidRequest, mockReferer);
    request.forEach(req => {
      expect(req.method).to.be.equal(`POST`)
    });
  });
  it('correct request data', () => {
    const request = spec.buildRequests(mockBidRequest, mockReferer);
    const data = request.flatMap(resp => resp.data);
    data.forEach((req, index) => {
      expect(req.adUnitCode).to.be.equal(mockBidRequest[index].adUnitCode);
      expect(req.banner).to.be.equal(mockBidRequest[index].mediaTypes.banner);
      expect(req.bidId).to.be.equal(mockBidRequest[index].bidId);
      expect(req.endpointId).to.be.equal(mockBidRequest[index].params.endpointId);
      expect(req.referer).to.be.equal(mockReferer.refererInfo.page);
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
    const request = spec.buildRequests(mockBidRequest, mockReferer);
    const data = request.flatMap(resp => resp.data);
    data.forEach((req, index) => {
      expect(req.banner.sizes).to.be.equal(mockBidRequest[index].params.sizes);
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
    const request = spec.buildRequests(mockBidRequest, mockReferer);
    const data = request.flatMap(resp => resp.data);
    data.forEach((req, index) => {
      expect(req.video.sizes).to.be.equal(mockBidRequest[index].params.sizes);
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
    request = spec.buildRequests(brData, mockReferer)[0];
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
    request = spec.buildRequests(brData, mockReferer)[0];
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

describe('SmartyTechDSPAdapter: buildRequests with user IDs', () => {
  let mockBidRequest;
  let mockReferer;
  beforeEach(() => {
    mockBidRequest = mockBidRequestWithUserIds('banner', 2, []);
    mockReferer = mockRefererData();
  });

  it('should include userIds when available', () => {
    const request = spec.buildRequests(mockBidRequest, mockReferer);
    const data = request.flatMap(resp => resp.data);

    data.forEach((req, index) => {
      expect(req).to.have.property('userIds');
      expect(req.userIds).to.deep.equal(mockBidRequest[index].userIdAsEids);
    });
  });

  it('should not include userIds when not available', () => {
    const bidRequestWithoutUserIds = mockBidRequestListData('banner', 2, []);
    const request = spec.buildRequests(bidRequestWithoutUserIds, mockReferer);
    const data = request.flatMap(resp => resp.data);

    data.forEach((req) => {
      expect(req).to.not.have.property('userIds');
    });
  });

  it('should not include userIds when userIdAsEids is undefined', () => {
    const bidRequestWithUndefinedUserIds = mockBidRequestListData('banner', 2, []).map(req => {
      const {userIdAsEids, ...requestWithoutUserIds} = req;
      return requestWithoutUserIds;
    });
    const request = spec.buildRequests(bidRequestWithUndefinedUserIds, mockReferer);
    const data = request.flatMap(resp => resp.data);

    data.forEach((req) => {
      expect(req).to.not.have.property('userIds');
    });
  });

  it('should not include userIds when userIdAsEids is empty array', () => {
    const bidRequestWithEmptyUserIds = mockBidRequestListData('banner', 2, []).map(req => ({
      ...req,
      userIdAsEids: []
    }));
    const request = spec.buildRequests(bidRequestWithEmptyUserIds, mockReferer);
    const data = request.flatMap(resp => resp.data);

    data.forEach((req) => {
      expect(req).to.not.have.property('userIds');
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
    const request = spec.buildRequests(mockBidRequest, mockBidderRequest);
    const data = request.flatMap(resp => resp.data);

    data.forEach((req) => {
      expect(req).to.have.property('gdprConsent');
      expect(req.gdprConsent.gdprApplies).to.be.true;
      expect(req.gdprConsent.consentString).to.equal('COzTVhaOzTVhaGvAAAENAiCIAP_AAH_AAAAAAEEUACCKAAA');
      expect(req.gdprConsent.addtlConsent).to.equal('1~1.35.41.101');
    });
  });

  it('should include USP consent when available', () => {
    const request = spec.buildRequests(mockBidRequest, mockBidderRequest);
    const data = request.flatMap(resp => resp.data);

    data.forEach((req) => {
      expect(req).to.have.property('uspConsent');
      expect(req.uspConsent).to.equal('1YNN');
    });
  });

  it('should not include consent data when not available', () => {
    const mockReferer = mockRefererData();
    const request = spec.buildRequests(mockBidRequest, mockReferer);
    const data = request.flatMap(resp => resp.data);

    data.forEach((req) => {
      expect(req).to.not.have.property('gdprConsent');
      expect(req).to.not.have.property('uspConsent');
    });
  });
});

describe('SmartyTechDSPAdapter: Alias User ID (auId)', () => {
  let cookiesAreEnabledStub;
  let getCookieStub;
  let setCookieStub;
  let generateUUIDStub;

  beforeEach(() => {
    cookiesAreEnabledStub = sinon.stub(storage, 'cookiesAreEnabled');
    getCookieStub = sinon.stub(storage, 'getCookie');
    setCookieStub = sinon.stub(storage, 'setCookie');
    generateUUIDStub = sinon.stub(utils, 'generateUUID');
  });

  afterEach(() => {
    cookiesAreEnabledStub.restore();
    getCookieStub.restore();
    setCookieStub.restore();
    generateUUIDStub.restore();
  });

  it('should return null if cookies are not enabled', () => {
    cookiesAreEnabledStub.returns(false);
    const auId = getAliasUserId();
    expect(auId).to.be.null;
  });

  it('should return existing auId from cookie', () => {
    const existingAuId = 'existing-uuid-1234';
    cookiesAreEnabledStub.returns(true);
    getCookieStub.returns(existingAuId);

    const auId = getAliasUserId();
    expect(auId).to.equal(existingAuId);
    expect(generateUUIDStub.called).to.be.false;
  });

  it('should generate and store new auId if cookie does not exist', () => {
    const newAuId = 'new-uuid-5678';
    cookiesAreEnabledStub.returns(true);
    getCookieStub.returns(null);
    generateUUIDStub.returns(newAuId);

    const auId = getAliasUserId();
    expect(auId).to.equal(newAuId);
    expect(generateUUIDStub.calledOnce).to.be.true;
    expect(setCookieStub.calledOnce).to.be.true;

    // Check that setCookie was called with correct parameters
    const setCookieCall = setCookieStub.getCall(0);
    expect(setCookieCall.args[0]).to.equal('_smartytech_auid'); // cookie name
    expect(setCookieCall.args[1]).to.equal(newAuId); // cookie value
    expect(setCookieCall.args[3]).to.equal('Lax'); // sameSite
  });

  it('should generate and store new auId if cookie is empty string', () => {
    const newAuId = 'new-uuid-9999';
    cookiesAreEnabledStub.returns(true);
    getCookieStub.returns('');
    generateUUIDStub.returns(newAuId);

    const auId = getAliasUserId();
    expect(auId).to.equal(newAuId);
    expect(generateUUIDStub.calledOnce).to.be.true;
  });
});

describe('SmartyTechDSPAdapter: buildRequests with auId', () => {
  let mockBidRequest;
  let mockReferer;
  let cookiesAreEnabledStub;
  let getCookieStub;

  beforeEach(() => {
    mockBidRequest = mockBidRequestListData('banner', 2, []);
    mockReferer = mockRefererData();
    cookiesAreEnabledStub = sinon.stub(storage, 'cookiesAreEnabled');
    getCookieStub = sinon.stub(storage, 'getCookie');
  });

  afterEach(() => {
    cookiesAreEnabledStub.restore();
    getCookieStub.restore();
  });

  it('should include auId in bid request when available', () => {
    const testAuId = 'test-auid-12345';
    cookiesAreEnabledStub.returns(true);
    getCookieStub.returns(testAuId);

    const request = spec.buildRequests(mockBidRequest, mockReferer);
    const data = request.flatMap(resp => resp.data);

    data.forEach((req) => {
      expect(req).to.have.property('auId');
      expect(req.auId).to.equal(testAuId);
    });
  });

  it('should not include auId when cookies are disabled', () => {
    cookiesAreEnabledStub.returns(false);

    const request = spec.buildRequests(mockBidRequest, mockReferer);
    const data = request.flatMap(resp => resp.data);

    data.forEach((req) => {
      expect(req).to.not.have.property('auId');
    });
  });
});
