import {config} from 'src/config.js';
import {setOrtbExtPrebidFloors, setOrtbImpBidFloor, setGranularBidfloors} from '../../../modules/priceFloors.js';
import 'src/prebid.js';
import {ORTB_MTYPES} from '../../../libraries/ortbConverter/processors/mediaType.js';

describe('pbjs - ortb imp floor params', () => {
  before(() => {
    config.resetConfig();
  });

  afterEach(() => {
    config.resetConfig();
  });

  Object.entries({
    'has no getFloor': {},
    'has getFloor that throws': {
      getFloor: sinon.stub().callsFake(() => { throw new Error() }),
    },
    'returns invalid floor': {
      getFloor: sinon.stub().callsFake(() => ({floor: NaN, currency: null}))
    }
  }).forEach(([t, req]) => {
    it(`has no effect if bid ${t}`, () => {
      const imp = {};
      setOrtbImpBidFloor(imp, {}, {});
      expect(imp).to.eql({});
    })
  })

  it('sets bidfoor and bidfloorcur according to getFloor', () => {
    const imp = {};
    const req = {
      getFloor() {
        return {
          currency: 'EUR',
          floor: '1.23'
        }
      }
    };
    setOrtbImpBidFloor(imp, req, {});
    expect(imp).to.eql({
      bidfloor: 1.23,
      bidfloorcur: 'EUR'
    })
  });

  Object.entries({
    'missing currency': {floor: 1.23},
    'missing floor': {currency: 'USD'},
    'not a number': {floor: 'abc', currency: 'USD'}
  }).forEach(([t, floor]) => {
    it(`should not set bidfloor if floor is ${t}`, () => {
      const imp = {};
      const req = {
        getFloor: () => floor
      }
      setOrtbImpBidFloor(imp, req, {});
      expect(imp).to.eql({});
    })
  })

  describe('asks for floor in currency', () => {
    let req;
    beforeEach(() => {
      req = {
        getFloor(opts) {
          return {
            floor: 1.23,
            currency: opts.currency
          }
        }
      }
    })

    it('from context.currency', () => {
      const imp = {};
      setOrtbImpBidFloor(imp, req, {currency: 'JPY'});
      config.setConfig({
        currency: {
          adServerCurrency: 'EUR'
        }
      })
      expect(imp.bidfloorcur).to.eql('JPY');
    });

    it('from config', () => {
      const imp = {};
      config.setConfig({
        currency: {
          adServerCurrency: 'EUR'
        }
      });
      setOrtbImpBidFloor(imp, req, {});
      expect(imp.bidfloorcur).to.eql('EUR');
    });

    it('defaults to USD', () => {
      const imp = {};
      setOrtbImpBidFloor(imp, req, {});
      expect(imp.bidfloorcur).to.eql('USD');
    })
  });

  it('asks for specific mediaType if context.mediaType is set', () => {
    let reqMediaType;
    const req = {
      getFloor(opts) {
        reqMediaType = opts.mediaType;
      }
    }
    setOrtbImpBidFloor({}, req, {mediaType: 'banner'});
    expect(reqMediaType).to.eql('banner');
  })
});

describe('setOrtbImpExtBidFloor', () => {
  let bidRequest, floor, currency, imp;
  beforeEach(() => {
    bidRequest = {
      getFloor: sinon.stub().callsFake(() => ({floor, currency}))
    }
    imp = {
      bidfloor: 1.23,
      bidfloorcur: 'EUR'
    };
  });

  Object.values(ORTB_MTYPES).forEach(mediaType => {
    describe(`${mediaType}.ext.bidfloor`, () => {
      it(`should NOT be set if imp has no ${mediaType}`, () => {
        setGranularBidfloors(imp, bidRequest);
        expect(imp[mediaType]).to.not.exist;
      });
      it('should NOT be set if floor is same as imp.bidfloor', () => {
        floor = 1.23
        currency = 'EUR'
        imp[mediaType] = {};
        setGranularBidfloors(imp, bidRequest);
        expect(imp[mediaType].ext).to.not.exist;
        sinon.assert.calledWith(bidRequest.getFloor, sinon.match({mediaType}))
      });
      it('should be set otherwise', () => {
        floor = 3.21;
        currency = 'JPY';
        imp[mediaType] = {};
        setGranularBidfloors(imp, bidRequest);
        expect(imp[mediaType].ext).to.eql({
          bidfloor: 3.21,
          bidfloorcur: 'JPY'
        });
        sinon.assert.calledWith(bidRequest.getFloor, sinon.match({mediaType}))
      });
    });
  });
  describe('per-format floors', () => {
    beforeEach(() => {
      imp = {
        banner: {
          format: [
            {w: 1, h: 2},
            {w: 3, h: 4}
          ]
        }
      }
    });

    it('should NOT be set if same as imp.bidfloor', () => {
      floor = 1.23
      currency = 'EUR';
      setGranularBidfloors(imp, bidRequest);
      expect(imp.banner.format.filter(fmt => fmt.bidfloor)).to.eql([]);
      [[1, 2], [3, 4]].forEach(size => {
        sinon.assert.calledWith(bidRequest.getFloor, sinon.match({size}));
      });
    });

    it('should be set otherwise', () => {
      floor = 3.21;
      currency = 'JPY';
      setGranularBidfloors(imp, bidRequest);
      imp.banner.format.forEach((fmt) => {
        expect(fmt.ext).to.eql({bidfloor: 3.21, bidfloorcur: 'JPY'});
        sinon.assert.calledWith(bidRequest.getFloor, sinon.match({mediaType: 'banner', size: [fmt.w, fmt.h]}));
      })
    });

    it('should not be set if format is missing w/h', () => {
      floor = 3.21;
      currency = 'JPY';
      delete imp.banner.format[0].w;
      setGranularBidfloors(imp, bidRequest);
      expect(imp.banner.format[0].ext).to.not.exist;
    })
  })
})

describe('setOrtbExtPrebidFloors', () => {
  before(() => {
    config.setConfig({floors: {}});
  })
  after(() => {
    config.setConfig({floors: {enabled: false}});
  });

  it('should set ext.prebid.floors.enabled to false', () => {
    const req = {};
    setOrtbExtPrebidFloors(req);
    expect(req.ext.prebid.floors.enabled).to.equal(false);
  })

  it('should respect fpd', () => {
    const req = {
      ext: {
        prebid: {
          floors: {
            enabled: true
          }
        }
      }
    }
    setOrtbExtPrebidFloors(req);
    expect(req.ext.prebid.floors.enabled).to.equal(true);
  })
})
