import { expect } from 'chai';

import parse from 'url-parse';
import buildDfpVideoUrl from 'modules/dfpAdServerVideo';
import { parseQS } from 'src/url';
import adUnit from 'test/fixtures/video/adUnit';

const bid = {
  videoCacheKey: 'abc',
  adserverTargeting: { },
};

describe('The DFP video support module', () => {
  it('should make a legal request URL when given the required params', () => {
    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bid,
      params: {
        'iu': 'my/adUnit',
        'description_url': 'someUrl.com',
      }
    }));

    expect(url.protocol).to.equal('https:');
    expect(url.host).to.equal('pubads.g.doubleclick.net');

    const queryParams = parseQS(url.query);
    expect(queryParams).to.have.property('correlator');
    expect(queryParams).to.have.property('description_url', 'someUrl.com');
    expect(queryParams).to.have.property('env', 'vp');
    expect(queryParams).to.have.property('gdfp_req', '1');
    expect(queryParams).to.have.property('iu', 'my/adUnit');
    expect(queryParams).to.have.property('output', 'xml_vast3');
    expect(queryParams).to.have.property('sz', '640x480');
    expect(queryParams).to.have.property('unviewed_position_start', '1');
    expect(queryParams).to.have.property('url');
  });

  it('can take an adserver url as a parameter', () => {
    const bidCopy = Object.assign({ }, bid);
    bidCopy.vastUrl = 'vastUrl.example';

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      url: 'https://video.adserver.example/',
    }));

    expect(url.host).to.equal('video.adserver.example');

    const queryObject = parseQS(url.query);
    expect(queryObject.description_url).to.equal('vastUrl.example');
  });

  it('requires a params object or url', () => {
    const url = buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bid,
    });

    expect(url).to.be.undefined;
  });

  it('overwrites url params when both url and params object are given', () => {
    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bid,
      url: 'https://video.adserver.example/ads?sz=640x480&iu=/123/aduniturl&impl=s',
      params: { iu: 'my/adUnit' }
    }));

    const queryObject = parseQS(url.query);
    expect(queryObject.iu).to.equal('my/adUnit');
  });

  it('should override param defaults with user-provided ones', () => {
    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bid,
      params: {
        'iu': 'my/adUnit',
        'output': 'vast',
      }
    }));

    expect(parseQS(url.query)).to.have.property('output', 'vast');
  });

  it('should include the cache key and adserver targeting in cust_params', () => {
    const bidCopy = Object.assign({ }, bid);
    bidCopy.adserverTargeting = {
      hb_adid: 'ad_id',
    };

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      params: {
        'iu': 'my/adUnit'
      }
    }));
    const queryObject = parseQS(url.query);
    const customParams = parseQS('?' + decodeURIComponent(queryObject.cust_params));

    expect(customParams).to.have.property('hb_adid', 'ad_id');
    expect(customParams).to.have.property('hb_uuid', bid.videoCacheKey);
  });

  it('should merge the user-provided cust_params with the default ones', () => {
    const bidCopy = Object.assign({ }, bid);
    bidCopy.adserverTargeting = {
      hb_adid: 'ad_id',
    };

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      params: {
        'iu': 'my/adUnit',
        cust_params: {
          'my_targeting': 'foo',
        },
      },
    }));
    const queryObject = parseQS(url.query);
    const customParams = parseQS('?' + decodeURIComponent(queryObject.cust_params));

    expect(customParams).to.have.property('hb_adid', 'ad_id');
    expect(customParams).to.have.property('my_targeting', 'foo');
  });

  it('should not overwrite an existing description_url for object input and cache disabled', () => {
    const bidCopy = Object.assign({}, bid);
    bidCopy.vastUrl = 'vastUrl.example';

    const url = parse(buildDfpVideoUrl({
      adUnit: adUnit,
      bid: bidCopy,
      params: {
        iu: 'my/adUnit',
        description_url: 'descriptionurl.example'
      }
    }));

    const queryObject = parseQS(url.query);
    expect(queryObject.description_url).to.equal('descriptionurl.example');
  });

  it('should work with nobid responses', () => {
    const url = buildDfpVideoUrl({
      adUnit: adUnit,
      params: { 'iu': 'my/adUnit' }
    });

    expect(url).to.be.a('string');
  });
});
