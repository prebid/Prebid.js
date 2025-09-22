import { expect } from 'chai';
import { spec, converter } from '../../../modules/loopmeBidAdapter.js';
import { BANNER, VIDEO, NATIVE } from '../../../src/mediaTypes.js';
import { getUniqueIdentifierStr } from '../../../src/utils.js';

const bidder = 'loopme';

const mTypes = [
  { [BANNER]: { sizes: [[300, 250]] } },
  { [VIDEO]: {
    api: [3, 5],
    h: 480,
    w: 640,
    mimes: ['video/mp4'],
    plcmt: 4,
    protocols: [1, 2, 3, 4, 5, 6, 7, 8]
  } },
  { [NATIVE]: {
    adTemplate: `##hb_native_asset_id_1## ##hb_native_asset_id_2## ##hb_native_asset_id_3##`,
    image: { required: true, sendId: true },
    title: { required: true },
    body: { required: true } }
  }
];

const bidRequests = [{
  bidder,
  params: { bundleId: 'bundleId', placementId: 'placementId', publisherId: 'publisherId' },
  mediaTypes: FEATURES.VIDEO ? mTypes[1] : mTypes[0]
}];

const bidderRequest = {
  bidderCode: 'loopme',
  bids: [
    { bidder, params: { bundleId: 'bundleId', placementId: 'placementId', publisherId: 'publisherId' } }
  ],
  ortb2: {
    site: { page: 'https://loopme.com' }
  }
};

describe('LoopMeBidAdapter', function () {
  describe('isBidRequestValid', function () {
    const bidId = getUniqueIdentifierStr();

    describe('valid bid requests', function () {
      const validBids = [
        { publisherId: 'publisherId', bundleId: 'bundleId', placementId: 'placementId' },
        { publisherId: 'publisherId', bundleId: 'bundleId' },
        { publisherId: 'publisherId', placementId: 'placementId' },
        { publisherId: 'publisherId' }
      ].flatMap(params => mTypes.map(mediaTypes => ({ bidder, bidId, mediaTypes, params})));

      validBids.forEach(function (bid) {
        it('Should return true if bid request valid', function () {
          expect(spec.isBidRequestValid(bid)).eq(true, `Bid: ${JSON.stringify(bid)}`);
        })
      });
    });

    describe('invalid bid requests', function () {
      [
        { bundleId: 'bundleId', placementId: 'placementId' },
        { placementId: 'placementId' },
        { bundleId: 'bundleId' },
        { },
      ]
        .flatMap(params => mTypes.map(mediaTypes => ({ bidder, bidId, mediaTypes, params })))
        .forEach(bid =>
          it('Should return false if bid request invalid', function () {
            expect(spec.isBidRequestValid(bid)).to.be.false;
          })
        );
    });
  });

  describe('getUserSyncs', function () {
    it('Should return an empty array of syncs if response does not contain userSyncs', function () {
      [
        [],
        [{ body: {} }],
        [{ body: { ext: {} } }],
        [{ body: { ext: { usersyncs: [] } } }]
      ].forEach((response) => expect(spec.getUserSyncs({}, response)).to.be.an('array').that.is.empty)
    });

    it('Should return an array of user syncs objects', function () {
      const responses = [{
        body: {
          ext: {
            usersyncs: [
              { type: 'iframe', url: 'https://loopme.com/sync' },
              { type: 'image', url: 'http://loopme.com/sync' },
              { type: 'image', url: '//loopme.com/sync' },
              { type: 'image', url: 'invalid url' },
              { type: 'image' },
              { type: 'iframe' },
              { url: 'https://loopme.com/sync' },
            ]
          }
        }
      }];

      expect(spec.getUserSyncs({ pixelEnabled: true }, responses))
        .to.be.an('array').is.deep.equal([
          { type: 'image', url: 'http://loopme.com/sync' },
          { type: 'image', url: '//loopme.com/sync' }
        ]);

      expect(spec.getUserSyncs({ iframeEnabled: true }, responses))
        .to.be.an('array').is.deep.equal([{ type: 'iframe', url: 'https://loopme.com/sync' }]);

      expect(spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: true }, responses))
        .to.be.an('array').is.deep.equal([
          { type: 'iframe', url: 'https://loopme.com/sync' },
          { type: 'image', url: 'http://loopme.com/sync' },
          { type: 'image', url: '//loopme.com/sync' }
        ]);

      expect(spec.getUserSyncs({ }, responses)).to.be.an('array').is.empty;
    });
  });

  describe('buildRequests', function () {
    it('should return an bid request', function () {
      const bidRequest = spec.buildRequests(bidRequests, bidderRequest);
      expect(bidRequest.method).to.equal('POST');
      expect(bidRequest.url).to.equal('https://prebid.loopmertb.com/');
      expect(bidRequest.data).to.deep.nested.include({
        at: 1,
        'imp[0].ext.bidder': { bundleId: 'bundleId', placementId: 'placementId', publisherId: 'publisherId' },
        site: {
          page: 'https://loopme.com'
        }
      });
      if (FEATURES.VIDEO) {
        expect(bidRequest.data).to.deep.nested.include({
          'imp[0].video': {
            api: [3, 5],
            h: 480,
            w: 640,
            mimes: ['video/mp4'],
            plcmt: 4,
            protocols: [1, 2, 3, 4, 5, 6, 7, 8]
          }
        });
      } else {
        expect(bidRequest.data).to.deep.nested.include({
          'imp[0].banner.format[0]': {
            w: 300,
            h: 250
          }
        });
      }
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      body: {
        id: '67b4aa9305c4b0e4d73ce626',
        seatbid: [{
          bid: [{
            id: 'id',
            impid: 'id',
            price: 3.605,
            adm: '<h1>Test</h1>',
            adomain: ['loopme.com'],
            iurl: 'http://loopme.com',
            cid: 'id',
            crid: 'id',
            dealid: 'id',
            cat: ['IAB10'],
            burl: 'http://loopme.com',
            language: 'xx',
            mtype: 1,
            h: 250,
            w: 300,
          }],
          seat: '16',
        }],
        cur: 'USD',
      },
    };

    it('should return data returned by ORTB converter', () => {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.deep.equal(converter.fromORTB({ request: request.data, response: serverResponse.body }).bids);
    });
  });
});
