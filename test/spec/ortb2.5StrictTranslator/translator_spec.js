import { toOrtb25Strict } from '../../../libraries/ortb2.5StrictTranslator/translator.js';

describe('toOrtb25Strict', () => {
  let translator;
  beforeEach(() => {
    translator = sinon.stub().callsFake((o) => o);
  })
  it('uses provided translator', () => {
    translator.resetBehavior();
    translator.resetHistory();
    translator.callsFake(() => ({ id: 'test' }));
    expect(toOrtb25Strict(null, translator)).to.eql({ id: 'test' });
  });
  it('removes fields out of spec', () => {
    expect(toOrtb25Strict({ unk: 'field', imp: ['err', {}] }, translator)).to.eql({ imp: [{}] });
  });

  it('removes non-integer enum fields', () => {
    expect(toOrtb25Strict({ device: { devicetype: 1.5, connectiontype: 2, geo: { type: 2.5 } } }, translator)).to.eql({ device: { connectiontype: 2, geo: {} } });
  });

  it('removes device and geo fields with invalid OpenRTB primitive types', () => {
    expect(toOrtb25Strict({
      device: {
        ua: 'Mozilla/5.0',
        dnt: 1,
        lmt: 2,
        ip: 123,
        ipv6: '2001:db8::1',
        make: 'Apple',
        model: ['iPhone'],
        os: 'iOS',
        osv: 17,
        hwv: '15,2',
        h: 911,
        w: '1733',
        ppi: 460,
        pxratio: 3,
        js: 0,
        geofetch: true,
        language: 'en',
        carrier: 'Example Carrier',
        mccmnc: 310260,
        ifa: 'ifa',
        didsha1: {},
        didmd5: 'did-md5',
        dpidsha1: 'dpid-sha1',
        dpidmd5: 10,
        macsha1: 'mac-sha1',
        macmd5: false,
        geo: {
          lat: 12.34,
          lon: '56.78',
          accuracy: 10,
          lastfix: 'old',
          ipservice: 2,
          country: 'USA',
          region: 6,
          regionfips104: 'US06',
          metro: '807',
          city: 'LAX',
          zip: 90001,
          utcoffset: -480
        }
      }
    }, translator)).to.eql({
      device: {
        ua: 'Mozilla/5.0',
        dnt: 1,
        ipv6: '2001:db8::1',
        make: 'Apple',
        os: 'iOS',
        hwv: '15,2',
        h: 911,
        ppi: 460,
        pxratio: 3,
        js: 0,
        language: 'en',
        carrier: 'Example Carrier',
        ifa: 'ifa',
        didmd5: 'did-md5',
        dpidsha1: 'dpid-sha1',
        macsha1: 'mac-sha1',
        geo: {
          lat: 12.34,
          accuracy: 10,
          ipservice: 2,
          country: 'USA',
          regionfips104: 'US06',
          metro: '807',
          city: 'LAX',
          utcoffset: -480
        }
      }
    });
  });
});
