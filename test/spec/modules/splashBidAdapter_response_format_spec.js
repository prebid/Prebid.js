import { expect } from 'chai';
import 'src/prebid.js';
import { spec } from 'modules/splashBidAdapter.js';
import * as utils from 'src/utils.js';

const FORMATS = ['standard', 'parallax', 'interstitial'];
const FORMAT_FIELDS = ['splash', 'general'];
const INVALID_FORMATS = [null, '', 'unknown', 'banner', 'video', 'native', 7, true, {}, []];
const SIZES = { standard: [300, 600], parallax: [700, 1600], interstitial: [320, 480] };
const PLACEMENTS = { standard: '100021', parallax: '100022', interstitial: '100023' };

function makeBid(format, bidId = `${format}-bid`) {
  const [width, height] = SIZES[format];
  return {
    bidder: 'splash',
    bidId,
    adUnitCode: `${bidId}-slot`,
    params: {
      publisherId: '725',
      placementId: PLACEMENTS[format],
      ...(format === 'standard' ? {} : { displayFormat: format }),
    },
    mediaTypes: { banner: { sizes: [[width, height]] } },
    allowTopWindowRenderers: true,
    ortb2Imp: {},
  };
}

function buildRequest(bids) {
  const requests = spec.buildRequests(bids, {
    bidderCode: 'splash',
    bidderRequestId: 'splash-response-format-request',
    auctionId: 'splash-response-format-auction',
    timeout: 1500,
    refererInfo: { page: 'https://publisher.example/page', domain: 'publisher.example' },
    ortb2: {},
  });
  expect(requests).to.have.length(1);
  return requests[0];
}

function makeServerBid(format, bidId, ext = {}) {
  const [width, height] = SIZES[format];
  return {
    id: `${bidId}-response`,
    impid: bidId,
    price: 3.5,
    w: width,
    h: height,
    crid: `${bidId}-creative`,
    adm: `<div>${format} creative</div>`,
    ...(Object.keys(ext).length ? { ext } : {}),
  };
}

function responseFor(request, bids, seatbid) {
  return spec.interpretResponse({
    body: {
      id: 'splash-response-format-response',
      cur: 'PLN',
      seatbid: seatbid || [{ seat: 'splash', bid: bids }],
    },
  }, request);
}

function extension(field, value) {
  return field === 'splash' ? { splash: { format: value } } : { general: { display_format: value } };
}

function otherField(field, value) {
  return field === 'splash' ? { general: { display_format: value } } : { splash: { format: value } };
}

function withExtension(...parts) {
  return Object.assign({}, ...parts);
}

describe('splashBidAdapter response display formats', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'logWarn');
  });

  afterEach(() => sandbox.restore());

  FORMATS.forEach((requestFormat, formatIndex) => {
    it(`accepts missing response format fields for ${requestFormat} requests`, () => {
      const bid = makeBid(requestFormat);
      const request = buildRequest([bid]);
      const noFieldsBid = makeServerBid(requestFormat, bid.bidId);
      const undefinedFieldsBid = makeServerBid(requestFormat, bid.bidId, {
        splash: { format: undefined },
        general: {},
      });
      expect(responseFor(request, [noFieldsBid])).to.have.length(1);
      expect(responseFor(request, [undefinedFieldsBid])).to.have.length(1);
    });

    FORMAT_FIELDS.forEach((field, fieldIndex) => {
      it(`accepts a case-insensitive matching ${field} format for ${requestFormat}`, () => {
        const bid = makeBid(requestFormat);
        const request = buildRequest([bid]);
        const value = (formatIndex + fieldIndex) % 2 ? requestFormat.toUpperCase() : requestFormat;
        const responseBid = makeServerBid(requestFormat, bid.bidId, extension(field, value));
        expect(responseFor(request, [responseBid])).to.have.length(1);
      });

      it(`rejects a mismatching ${field} format for ${requestFormat}`, () => {
        const bid = makeBid(requestFormat);
        const request = buildRequest([bid]);
        const otherFormat = FORMATS[(formatIndex + 1) % FORMATS.length];
        const responseBid = makeServerBid(requestFormat, bid.bidId, extension(field, otherFormat));
        expect(responseFor(request, [responseBid])).to.deep.equal([]);
      });
    });

    it(`rejects conflicting recognized format fields for ${requestFormat}`, () => {
      const bid = makeBid(requestFormat);
      const request = buildRequest([bid]);
      const otherFormat = FORMATS[(formatIndex + 1) % FORMATS.length];
      const responseBid = makeServerBid(requestFormat, bid.bidId, withExtension(
        extension('splash', requestFormat.toUpperCase()),
        extension('general', otherFormat),
      ));
      expect(responseFor(request, [responseBid])).to.deep.equal([]);
    });
  });

  FORMAT_FIELDS.forEach((field, fieldIndex) => {
    INVALID_FORMATS.forEach((invalidValue, invalidIndex) => {
      const requestFormat = FORMATS[(fieldIndex + invalidIndex) % FORMATS.length];
      it(`rejects ${String(invalidValue)} in ext.${field} even when the other format field matches`, () => {
        const bid = makeBid(requestFormat);
        const request = buildRequest([bid]);
        const responseBid = makeServerBid(requestFormat, bid.bidId, withExtension(
          extension(field, invalidValue),
          otherField(field, requestFormat),
        ));
        expect(responseFor(request, [responseBid])).to.deep.equal([]);
      });
    });
  });

  it('drops a malformed bid without losing valid neighbors across seats or mutating the response', () => {
    const standardGood = makeBid('standard', 'standard-good');
    const standardBad = makeBid('standard', 'standard-bad');
    const parallaxGood = makeBid('parallax', 'parallax-good');
    const request = buildRequest([standardGood, standardBad, parallaxGood]);
    const malformed = makeServerBid('standard', standardBad.bidId, withExtension(
      extension('splash', 'unsupported'),
      extension('general', 'standard'),
    ));
    const sameSeatGood = makeServerBid('standard', standardGood.bidId, extension('general', 'STANDARD'));
    const otherSeatGood = makeServerBid('parallax', parallaxGood.bidId, extension('splash', 'parallax'));
    const response = {
      body: {
        id: 'splash-mixed-response',
        cur: 'PLN',
        seatbid: [
          { seat: 'splash-primary', bid: [malformed, sameSeatGood] },
          { seat: 'splash-secondary', bid: [otherSeatGood] },
        ],
      },
    };
    const before = JSON.parse(JSON.stringify(response));

    const interpreted = spec.interpretResponse(response, request);

    expect(interpreted.map(bid => bid.requestId)).to.have.members([standardGood.bidId, parallaxGood.bidId]);
    expect(response).to.deep.equal(before);
  });
});
