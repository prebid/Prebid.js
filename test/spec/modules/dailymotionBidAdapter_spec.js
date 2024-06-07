import { config } from 'src/config.js';
import { expect } from 'chai';
import { spec } from 'modules/dailymotionBidAdapter.js';
import { BANNER, VIDEO } from '../../../src/mediaTypes';

describe('dailymotionBidAdapterTests', () => {
  // Validate that isBidRequestValid only validates requests with apiKey
  it('validates isBidRequestValid', () => {
    expect(config.runWithBidder('dailymotion', () => spec.isBidRequestValid())).to.be.false;

    const bidWithEmptyApi = {
      params: {
        apiKey: '',
      },
      mediaTypes: {
        [VIDEO]: {
          context: 'instream',
        },
      },
    };

    expect(config.runWithBidder('dailymotion', () => spec.isBidRequestValid(bidWithEmptyApi))).to.be.false;

    const bidWithApi = {
      params: {
        apiKey: 'test_api_key',
      },
      mediaTypes: {
        [VIDEO]: {
          context: 'instream',
        },
      },
    };

    expect(config.runWithBidder('dailymotion', () => spec.isBidRequestValid(bidWithApi))).to.be.true;

    const bidWithEmptyMediaTypes = {
      params: {
        apiKey: '',
      },
    };

    expect(config.runWithBidder('dailymotion', () => spec.isBidRequestValid(bidWithEmptyMediaTypes))).to.be.false;

    const bidWithEmptyVideoAdUnit = {
      params: {
        apiKey: '',
      },
      mediaTypes: {
        [VIDEO]: {},
      },
    };

    expect(config.runWithBidder('dailymotion', () => spec.isBidRequestValid(bidWithEmptyVideoAdUnit))).to.be.false;

    const bidWithBannerMediaType = {
      params: {
        apiKey: 'test_api_key',
      },
      mediaTypes: {
        [BANNER]: {},
      },
    };

    expect(config.runWithBidder('dailymotion', () => spec.isBidRequestValid(bidWithBannerMediaType))).to.be.false;

    const bidWithOutstreamContext = {
      params: {
        apiKey: 'test_api_key',
      },
      mediaTypes: {
        video: {
          context: 'outstream',
        },
      },
    };

    expect(config.runWithBidder('dailymotion', () => spec.isBidRequestValid(bidWithOutstreamContext))).to.be.false;
  });

  // Validate request generation
  it('validates buildRequests', () => {
    const bidRequestData = [{
      auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      bidId: 123456,
      adUnitCode: 'preroll',
      mediaTypes: {
        video: {
          api: [2, 7],
          mimes: ['video/mp4'],
          minduration: 5,
          maxduration: 30,
          protocols: [1, 2, 3, 4, 5, 6, 7, 8],
          skip: 1,
          skipafter: 5,
          skipmin: 10,
          startdelay: 0,
          w: 1280,
          h: 720
        },
      },
      sizes: [[1920, 1080]],
      params: {
        apiKey: 'test_api_key',
        video: {
          description: 'this is a test video',
          duration: 556,
          iabcat1: ['IAB-1'],
          iabcat2: ['6', '17'],
          id: '54321',
          lang: 'FR',
          private: false,
          tags: 'tag_1,tag_2,tag_3',
          title: 'test video',
          topics: 'topic_1, topic_2',
          xid: 'x123456',
          livestream: 1,
        },
      },
    }];

    const bidderRequestData = {
      refererInfo: {
        page: 'https://publisher.com',
      },
      uspConsent: '1YN-',
      gdprConsent: {
        apiVersion: 2,
        consentString: 'xxx',
        gdprApplies: true,
      },
      gppConsent: {
        gppString: 'xxx',
        applicableSections: [5],
      },
      ortb2: {
        regs: {
          coppa: 1,
        },
        site: {
          content: {
            data: [
              {
                name: 'dataprovider.com',
                ext: { segtax: 5 },
                segment: [{ id: '200' }],
              },
            ],
          },
        },
      },
    };

    const [request] = config.runWithBidder(
      'dailymotion',
      () => spec.buildRequests(bidRequestData, bidderRequestData),
    );

    const { data: reqData } = request;

    expect(request.url).to.equal('https://pb.dmxleo.com');

    expect(reqData.bidder_request).to.eql({
      refererInfo: bidderRequestData.refererInfo,
      uspConsent: bidderRequestData.uspConsent,
      gdprConsent: bidderRequestData.gdprConsent,
      gppConsent: bidderRequestData.gppConsent,
    });
    expect(reqData.config.api_key).to.eql(bidRequestData[0].params.apiKey);
    expect(reqData.coppa).to.be.true;
    expect(reqData.request.auctionId).to.eql(bidRequestData[0].auctionId);
    expect(reqData.request.bidId).to.eql(bidRequestData[0].bidId);
    expect(reqData.request.mediaTypes.video.api).to.eql(bidRequestData[0].mediaTypes.video.api);
    expect(reqData.request.mediaTypes.video.playerSize).to.eql(bidRequestData[0].mediaTypes.video.playerSize);
    expect(reqData.request.mediaTypes.video.startdelay).to.eql(bidRequestData[0].mediaTypes.video.startdelay);
    expect(reqData.video_metadata).to.eql({
      description: bidRequestData[0].params.video.description,
      iabcat1: ['IAB-1'],
      iabcat2: bidRequestData[0].params.video.iabcat2,
      id: bidRequestData[0].params.video.id,
      lang: bidRequestData[0].params.video.lang,
      private: bidRequestData[0].params.video.private,
      tags: bidRequestData[0].params.video.tags,
      title: bidRequestData[0].params.video.title,
      topics: bidRequestData[0].params.video.topics,
      xid: bidRequestData[0].params.video.xid,
      duration: bidRequestData[0].params.video.duration,
      livestream: !!bidRequestData[0].params.video.livestream,
    });
  });

  it('validates buildRequests with content values from App', () => {
    const bidRequestData = [{
      auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      bidId: 123456,
      adUnitCode: 'preroll',
      mediaTypes: {
        video: {
          api: [2, 7],
          mimes: ['video/mp4'],
          minduration: 5,
          maxduration: 30,
          protocols: [1, 2, 3, 4, 5, 6, 7, 8],
          skip: 1,
          skipafter: 5,
          skipmin: 10,
          startdelay: 0,
          w: 1280,
          h: 720,
        },
      },
      sizes: [[1920, 1080]],
      params: {
        apiKey: 'test_api_key',
        video: {
          description: 'this is a test video',
          iabcat2: ['6', '17'],
          id: '54321',
          lang: 'FR',
          private: false,
          tags: 'tag_1,tag_2,tag_3',
          title: 'test video',
          topics: 'topic_1, topic_2',
          xid: 'x123456',
          livestream: 1,
        },
      },
    }];

    const bidderRequestData = {
      refererInfo: {
        page: 'https://publisher.com',
      },
      uspConsent: '1YN-',
      gdprConsent: {
        apiVersion: 2,
        consentString: 'xxx',
        gdprApplies: true,
      },
      gppConsent: {
        gppString: 'xxx',
        applicableSections: [5],
      },
      ortb2: {
        regs: {
          coppa: 1,
        },
        app: {
          bundle: 'app-bundle',
          storeurl: 'https://play.google.com/store/apps/details?id=app-bundle',
          content: {
            len: 556,
            data: [
              {
                name: 'dataprovider.com',
                ext: { segtax: 4 },
                segment: [{ id: 'IAB-1' }],
              },
              {
                name: 'dataprovider.com',
                ext: { segtax: 5 },
                segment: [{ id: '200' }],
              },
            ],
          },
        },
      },
    };

    const [request] = config.runWithBidder(
      'dailymotion',
      () => spec.buildRequests(bidRequestData, bidderRequestData),
    );

    const { data: reqData } = request;

    expect(request.url).to.equal('https://pb.dmxleo.com');

    expect(reqData.bidder_request).to.eql({
      refererInfo: bidderRequestData.refererInfo,
      uspConsent: bidderRequestData.uspConsent,
      gdprConsent: bidderRequestData.gdprConsent,
      gppConsent: bidderRequestData.gppConsent,
    });
    expect(reqData.config.api_key).to.eql(bidRequestData[0].params.apiKey);
    expect(reqData.coppa).to.be.true;
    expect(reqData.appBundle).to.eql(bidderRequestData.ortb2.app.bundle);
    expect(reqData.appStoreUrl).to.eql(bidderRequestData.ortb2.app.storeurl);
    expect(reqData.request.auctionId).to.eql(bidRequestData[0].auctionId);
    expect(reqData.request.bidId).to.eql(bidRequestData[0].bidId);
    expect(reqData.request.mediaTypes.video.api).to.eql(bidRequestData[0].mediaTypes.video.api);
    expect(reqData.request.mediaTypes.video.mimes).to.eql(bidRequestData[0].mediaTypes.video.mimes);
    expect(reqData.request.mediaTypes.video.minduration).to.eql(bidRequestData[0].mediaTypes.video.minduration);
    expect(reqData.request.mediaTypes.video.maxduration).to.eql(bidRequestData[0].mediaTypes.video.maxduration);
    expect(reqData.request.mediaTypes.video.protocols).to.eql(bidRequestData[0].mediaTypes.video.protocols);
    expect(reqData.request.mediaTypes.video.skip).to.eql(bidRequestData[0].mediaTypes.video.skip);
    expect(reqData.request.mediaTypes.video.skipafter).to.eql(bidRequestData[0].mediaTypes.video.skipafter);
    expect(reqData.request.mediaTypes.video.skipmin).to.eql(bidRequestData[0].mediaTypes.video.skipmin);
    expect(reqData.request.mediaTypes.video.startdelay).to.eql(bidRequestData[0].mediaTypes.video.startdelay);
    expect(reqData.request.mediaTypes.video.w).to.eql(bidRequestData[0].mediaTypes.video.w);
    expect(reqData.request.mediaTypes.video.h).to.eql(bidRequestData[0].mediaTypes.video.h);
    expect(reqData.video_metadata).to.eql({
      description: bidRequestData[0].params.video.description,
      iabcat1: ['IAB-1'],
      iabcat2: bidRequestData[0].params.video.iabcat2,
      id: bidRequestData[0].params.video.id,
      lang: bidRequestData[0].params.video.lang,
      private: bidRequestData[0].params.video.private,
      tags: bidRequestData[0].params.video.tags,
      title: bidRequestData[0].params.video.title,
      topics: bidRequestData[0].params.video.topics,
      xid: bidRequestData[0].params.video.xid,
      // Overriden through bidder params
      duration: bidderRequestData.ortb2.app.content.len,
      livestream: !!bidRequestData[0].params.video.livestream,
    });
  });

  it('validates buildRequests with fallback values on ortb2 (gpp, iabcat2, id...)', () => {
    const bidRequestData = [{
      auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
      bidId: 123456,
      adUnitCode: 'preroll',
      mediaTypes: {
        video: {
          api: [2, 7],
          startdelay: 0,
        },
      },
      sizes: [[1920, 1080]],
      params: {
        apiKey: 'test_api_key',
        video: {
          description: 'this is a test video',
          duration: 556,
          private: false,
          title: 'test video',
          topics: 'topic_1, topic_2',
          xid: 'x123456',
        },
      },
    }];

    const bidderRequestData = {
      refererInfo: {
        page: 'https://publisher.com',
      },
      uspConsent: '1YN-',
      gdprConsent: {
        apiVersion: 2,
        consentString: 'xxx',
        gdprApplies: true,
      },
      ortb2: {
        regs: {
          gpp: 'xxx',
          gpp_sid: [5],
          coppa: 0,
        },
        site: {
          content: {
            id: '54321',
            language: 'FR',
            keywords: 'tag_1,tag_2,tag_3',
            title: 'test video',
            livestream: 1,
            cat: ['IAB-2'],
            data: [
              undefined, // Undefined to check proper handling of edge cases
              {}, // Empty object to check proper handling of edge cases
              { ext: {} }, // Empty ext to check proper handling of edge cases
              {
                name: 'dataprovider.com',
                ext: { segtax: 22 }, // Invalid segtax to check proper handling of edge cases
                segment: [{ id: '400' }],
              },
              {
                name: 'dataprovider.com',
                ext: { segtax: 5 },
                segment: undefined, // Invalid segment to check proper handling of edge cases
              },
              {
                name: 'dataprovider.com',
                ext: { segtax: 4 },
                segment: undefined, // Invalid segment to check proper handling of edge cases
              },
              {
                name: 'dataprovider.com',
                ext: { segtax: 5 },
                segment: [{ id: 2222 }], // Invalid segment id to check proper handling of edge cases
              },
              {
                name: 'dataprovider.com',
                ext: { segtax: 5 },
                segment: [{ id: '6' }],
              },
              {
                name: 'dataprovider.com',
                ext: { segtax: 5 },
                segment: [{ id: '6' }], // Check that same cat won't be duplicated
              },
              {
                name: 'dataprovider.com',
                ext: { segtax: 5 },
                segment: [{ id: '17' }, { id: '20' }],
              },
            ],
          },
        },
      },
    };

    const [request] = config.runWithBidder(
      'dailymotion',
      () => spec.buildRequests(bidRequestData, bidderRequestData),
    );

    const { data: reqData } = request;

    expect(request.url).to.equal('https://pb.dmxleo.com');

    expect(reqData.bidder_request).to.eql({
      refererInfo: bidderRequestData.refererInfo,
      uspConsent: bidderRequestData.uspConsent,
      gdprConsent: bidderRequestData.gdprConsent,
      gppConsent: {
        gppString: bidderRequestData.ortb2.regs.gpp,
        applicableSections: bidderRequestData.ortb2.regs.gpp_sid,
      },
    });
    expect(reqData.config.api_key).to.eql(bidRequestData[0].params.apiKey);
    expect(reqData.coppa).to.be.false;
    expect(reqData.request.auctionId).to.eql(bidRequestData[0].auctionId);
    expect(reqData.request.bidId).to.eql(bidRequestData[0].bidId);
    expect(reqData.request.mediaTypes.video.api).to.eql(bidRequestData[0].mediaTypes.video.api);
    expect(reqData.request.mediaTypes.video.playerSize).to.eql(bidRequestData[0].mediaTypes.video.playerSize);
    expect(reqData.request.mediaTypes.video.startdelay).to.eql(bidRequestData[0].mediaTypes.video.startdelay);
    expect(reqData.video_metadata).to.eql({
      description: bidRequestData[0].params.video.description,
      iabcat1: ['IAB-2'],
      iabcat2: ['6', '17', '20'],
      id: bidderRequestData.ortb2.site.content.id,
      lang: bidderRequestData.ortb2.site.content.language,
      private: bidRequestData[0].params.video.private,
      tags: bidderRequestData.ortb2.site.content.keywords,
      title: bidderRequestData.ortb2.site.content.title,
      topics: bidRequestData[0].params.video.topics,
      xid: bidRequestData[0].params.video.xid,
      duration: bidRequestData[0].params.video.duration,
      livestream: !!bidderRequestData.ortb2.site.content.livestream,
    });
  });

  it('validates buildRequests - with default values on empty bid & bidder request', () => {
    const bidRequestDataWithApi = [{
      params: {
        apiKey: 'test_api_key',
      },
    }];

    const [request] = config.runWithBidder(
      'dailymotion',
      () => spec.buildRequests(bidRequestDataWithApi, {}),
    );

    const { data: reqData } = request;

    expect(request.url).to.equal('https://pb.dmxleo.com');

    expect(reqData.config.api_key).to.eql(bidRequestDataWithApi[0].params.apiKey);
    expect(reqData.coppa).to.be.false;

    expect(reqData.bidder_request).to.eql({
      gdprConsent: {
        apiVersion: 1,
        consentString: '',
        gdprApplies: false,
      },
      refererInfo: {
        page: '',
      },
      uspConsent: '',
      gppConsent: {
        gppString: '',
        applicableSections: [],
      },
    });

    expect(reqData.request).to.eql({
      auctionId: '',
      bidId: '',
      adUnitCode: '',
      mediaTypes: {
        video: {
          api: [],
          mimes: [],
          minduration: 0,
          maxduration: 0,
          protocols: [],
          skip: 0,
          skipafter: 0,
          skipmin: 0,
          startdelay: 0,
          w: 0,
          h: 0,
        },
      },
      sizes: [],
    });

    expect(reqData.video_metadata).to.eql({
      description: '',
      duration: 0,
      iabcat1: [],
      iabcat2: [],
      id: '',
      lang: '',
      private: false,
      tags: '',
      title: '',
      topics: '',
      xid: '',
      livestream: false,
    });
  });

  it('validates buildRequests - with empty/undefined validBidRequests', () => {
    expect(spec.buildRequests([], {})).to.have.lengthOf(0);

    expect(spec.buildRequests(undefined, {})).to.have.lengthOf(0);
  });

  it('validates interpretResponse', () => {
    const serverResponse = {
      body: {
        ad: 'https://fakecacheserver/cache?uuid=1234',
        cacheId: '1234',
        cpm: 20.0,
        creativeId: '5678',
        currency: 'USD',
        dealId: 'deal123',
        nurl: 'https://bid/nurl',
        requestId: 'test_requestid',
        vastUrl: 'https://fakecacheserver/cache?uuid=1234',
      },
    };

    const bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);

    const [bid] = bids;
    expect(bid).to.eql(serverResponse.body);
  });

  it('validates interpretResponse - with empty/undefined serverResponse', () => {
    expect(spec.interpretResponse({})).to.have.lengthOf(0);

    expect(spec.interpretResponse(undefined)).to.have.lengthOf(0);
  });
});
