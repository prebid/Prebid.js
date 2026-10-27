import { expect } from 'chai';
import { spec } from 'modules/panxoBidAdapter.js';
import adapterManager from 'src/adapterManager.js';
import { BANNER } from 'src/mediaTypes.js';
import {
  _floorDataForAuction,
  createFloorsDataForAuction,
  handleSetFloorsConfig,
  setOrtbImpBidFloor
} from 'modules/priceFloors.js';
import { setConfig as setCurrencyConfig } from 'modules/currency.js';

describe('Panxo floor migration through the real Prebid core', function () {
  beforeEach(function () {
    setCurrencyConfig({});
  });

  afterEach(function () {
    handleSetFloorsConfig({ enabled: false });
    setCurrencyConfig({});
  });

  function build({ values, floorConfig = {}, standardFloor, legacy = 2, omitLegacy = false, currency = 'USD', floorCurrency = 'USD', rates, mediaTypes } = {}) {
    const adUnits = [{
      code: 'panxo-floor-migration',
      mediaTypes: mediaTypes || { banner: { sizes: [[300, 250]] } },
      bids: [{ bidder: 'panxo', params: { propertyKey: 'synthetic-floor-property', ...(omitLegacy ? {} : { floor: legacy }) } }],
      ortb2Imp: standardFloor
    }];
    const auctionId = 'panxo-floor-migration-auction';
    if (rates) setCurrencyConfig({ adServerCurrency: currency, rates });
    if (values !== undefined || Object.keys(floorConfig).length) {
      handleSetFloorsConfig({
        enabled: true,
        data: values === undefined ? undefined : {
          currency: floorCurrency,
          schema: { fields: ['mediaType'] },
          values
        },
        ...floorConfig
      });
      _floorDataForAuction[auctionId] = createFloorsDataForAuction(adUnits, auctionId);
    }
    const [bidderRequest] = adapterManager.makeBidRequests(adUnits, Date.now(), auctionId, 1000);
    bidderRequest.ortb2 = { ext: { prebid: { adServerCurrency: currency } } };
    const bid = bidderRequest.bids[0];
    const before = JSON.stringify({ params: bid.params, floorData: bid.floorData, ortb2Imp: bid.ortb2Imp });
    const [request] = spec.buildRequests([bid], bidderRequest);
    expect(JSON.stringify({ params: bid.params, floorData: bid.floorData, ortb2Imp: bid.ortb2Imp })).to.equal(before);
    const pbsImp = { ...standardFloor };
    setOrtbImpBidFloor(pbsImp, bid, { currency, mediaType: BANNER });
    return { request, imp: request?.data.imp[0], pbsImp, bid };
  }

  function expectPair(imp, floor, currency) {
    expect(imp.bidfloor || 0).to.equal(floor);
    expect(imp.bidfloorcur || 'USD').to.equal(currency);
  }

  it('retains the legacy fallback when standard floors have not been enabled', function () {
    expectPair(build().imp, 2, 'USD');
  });

  it('keeps the published legacy floor in USD when bids are requested in EUR', function () {
    expectPair(build({ currency: 'EUR' }).imp, 2, 'USD');
  });

  it('retains the legacy fallback when the core reports no floor data', function () {
    const { imp, bid } = build({ floorConfig: { enabled: true } });
    expect(bid.floorData.skippedReason).to.equal('not_found');
    expectPair(imp, 2, 'USD');
  });

  it('honors a real zero rule even though getFloor returns an empty object', function () {
    const { imp, pbsImp, bid } = build({ values: { banner: 0 } });
    expect(bid.getFloor({ currency: 'USD', mediaType: BANNER, size: [300, 250] })).to.deep.equal({});
    expectPair(imp, 0, 'USD');
    expectPair(pbsImp, 0, 'USD');
  });

  it('honors a real positive rule below the legacy fallback', function () {
    const { imp, pbsImp } = build({ values: { banner: 0.5 } });
    expectPair(imp, 0.5, 'USD');
    expectPair(pbsImp, 0.5, 'USD');
  });

  it('honors a real null rule as no floor', function () {
    const { imp, pbsImp, bid } = build({ values: { banner: null } });
    expect(bid.getFloor({ currency: 'USD', mediaType: BANNER, size: [300, 250] })).to.equal(null);
    expectPair(imp, 0, 'USD');
    expectPair(pbsImp, 0, 'USD');
  });

  it('does not reintroduce a legacy floor when the core skips floor signaling', function () {
    const { imp, pbsImp, bid } = build({ values: { banner: 1 }, floorConfig: { skipRate: 100 } });
    expect(bid.getFloor).to.be.undefined;
    expect(bid.floorData.skipped).to.equal(true);
    expect(bid.floorData.skippedReason).to.equal('random');
    expectPair(imp, 0, 'USD');
    expectPair(pbsImp, 0, 'USD');
  });

  it('respects noFloorSignalBidders metadata copied by the core', function () {
    const { imp, pbsImp, bid } = build({
      values: { banner: 1 },
      floorConfig: { enforcement: { noFloorSignalBidders: ['panxo'] } }
    });
    expect(bid.getFloor).to.be.undefined;
    expect(bid.floorData.noFloorSignaled).to.equal(true);
    expectPair(imp, 0, 'USD');
    expectPair(pbsImp, 0, 'USD');
  });

  it('honors a nonmatching standard rule without creating a bidder-specific minimum', function () {
    const { imp, pbsImp } = build({ values: { video: 5 } });
    expectPair(imp, 0, 'USD');
    expectPair(pbsImp, 0, 'USD');
  });

  it('allows the publisher to migrate the fallback into a standard default', function () {
    const { imp, pbsImp } = build({
      omitLegacy: true,
      floorConfig: { data: { currency: 'USD', schema: { fields: ['mediaType'] }, values: { video: 5 }, default: 2 } }
    });
    expectPair(imp, 2, 'USD');
    expectPair(pbsImp, 2, 'USD');
  });

  it('lets a zero rule override the publisher default', function () {
    const { imp, pbsImp } = build({
      floorConfig: { data: { currency: 'USD', schema: { fields: ['mediaType'] }, values: { banner: 0 }, default: 2 } }
    });
    expectPair(imp, 0, 'USD');
    expectPair(pbsImp, 0, 'USD');
  });

  it('rejects an unconvertible EUR floor while the core PBS serializer retains its original pair', function () {
    const { imp, pbsImp } = build({ values: { banner: 1.5 }, floorCurrency: 'EUR' });
    expect(imp).to.be.undefined;
    expectPair(pbsImp, 1.5, 'EUR');
  });

  it('uses actual Currency module conversion without relabeling an unconverted floor', function () {
    const { imp, pbsImp } = build({ values: { banner: 1.5 }, floorCurrency: 'EUR', rates: { EUR: { USD: 1.1 } } });
    expectPair(imp, 1.65, 'USD');
    expectPair(pbsImp, 1.65, 'USD');
  });

  it('rejects a positive static foreign floor when its rate is unavailable', function () {
    const { imp, pbsImp } = build({ standardFloor: { bidfloor: 1.25, bidfloorcur: 'EUR' } });
    expect(imp).to.be.undefined;
    expectPair(pbsImp, 1.25, 'EUR');
  });

  it('converts a static foreign floor without changing the publisher input', function () {
    const { imp, pbsImp } = build({
      standardFloor: { bidfloor: 1.25, bidfloorcur: 'EUR' },
      rates: { EUR: { USD: 2 } }
    });
    expectPair(imp, 2.5, 'USD');
    // The core serializer keeps the static pair; the PBS adapter owns conversion.
    expectPair(pbsImp, 1.25, 'EUR');
  });

  it('uses USD transport and real converted floors for an EUR ad server', function () {
    const { request, imp, pbsImp } = build({
      currency: 'EUR',
      values: { banner: 1.5 },
      floorCurrency: 'EUR',
      rates: { EUR: { USD: 2 } }
    });
    expect(request.data.cur).to.deep.equal(['USD']);
    expectPair(imp, 3, 'USD');
    expectPair(pbsImp, 1.5, 'EUR');
  });

  it('preserves an explicit static zero above the legacy fallback', function () {
    const { imp, pbsImp } = build({ standardFloor: { bidfloor: 0, bidfloorcur: 'EUR' } });
    expectPair(imp, 0, 'USD');
    expectPair(pbsImp, 0, 'EUR');
  });

  it('defaults the static OpenRTB floor currency to USD independently of request currency', function () {
    const { imp, pbsImp } = build({ currency: 'EUR', standardFloor: { bidfloor: 1.25 } });
    expectPair(imp, 1.25, 'USD');
    expectPair(pbsImp, 1.25, 'USD');
  });

  it('shows the pinned core conflict between a zero rule and a preexisting static floor', function () {
    const { imp, pbsImp } = build({ values: { banner: 0 }, standardFloor: { bidfloor: 3, bidfloorcur: 'USD' } });
    // The explicit active rule must not fall through to a legacy bidder minimum.
    expectPair(imp, 0, 'USD');
    // The pinned PBS serializer retains this static floor: this input is not equivalent.
    expectPair(pbsImp, 3, 'USD');
  });

  [
    { bidfloor: -1, bidfloorcur: 'USD' },
    { bidfloor: '1.25', bidfloorcur: 'USD' },
    { bidfloor: 1.25, bidfloorcur: 'US1' }
  ].forEach(standardFloor => {
    it(`rejects malformed static floor ${JSON.stringify(standardFloor)} without inventing a replacement price`, function () {
      expect(build({ standardFloor }).imp).to.be.undefined;
    });
  });

  it('does not compare positive multiformat floors expressed in incompatible currencies', function () {
    const bid = {
      bidder: 'panxo',
      bidId: 'mixed-currency',
      adUnitCode: 'mixed-currency',
      params: { propertyKey: 'synthetic-floor-property' },
      mediaTypes: {
        banner: { sizes: [[300, 250]] },
        video: { context: 'instream', playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [2] }
      },
      getFloor: ({ mediaType }) => ({ floor: 1, currency: mediaType === BANNER ? 'USD' : 'EUR' })
    };
    expect(spec.buildRequests([bid], { bidderRequestId: 'mixed-currency-request', bids: [bid] })).to.deep.equal([]);
  });

  it('rejects an unconvertible positive floor even when another format has a real zero rule', function () {
    const { imp, bid } = build({
      values: { banner: 0, video: 1.5 },
      floorCurrency: 'EUR',
      mediaTypes: {
        banner: { sizes: [[300, 250]] },
        video: { context: 'instream', playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [2] }
      }
    });
    expect(bid.getFloor({ currency: 'USD', mediaType: BANNER, size: [300, 250] })).to.deep.equal({});
    expect(imp).to.be.undefined;
  });

  it('converts the effective foreign floor when another format has a real zero rule', function () {
    const { imp } = build({
      values: { banner: 0, video: 1.5 },
      floorCurrency: 'EUR',
      rates: { EUR: { USD: 2 } },
      mediaTypes: {
        banner: { sizes: [[300, 250]] },
        video: { context: 'instream', playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [2] }
      }
    });
    expectPair(imp, 3, 'USD');
  });
});
