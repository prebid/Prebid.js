import { gamSubmoduleFactory } from 'modules/videoModule/gamAdServerSubmodule.js';
import { GAM_VENDOR } from 'libraries/video/constants/vendorCodes.js';
import { getGlobal } from 'src/prebidGlobal.js';

describe('GAM ad server submodule', function () {
  let previousAdServers;
  let gam;
  let provider;

  beforeEach(function () {
    previousAdServers = Object.getOwnPropertyDescriptor(getGlobal(), 'adServers');
    gam = {
      buildVideoUrl: sinon.stub(),
      getVastXml: sinon.stub()
    };
    getGlobal().adServers = { gam };
    provider = gamSubmoduleFactory();
  });

  afterEach(function () {
    if (previousAdServers) {
      Object.defineProperty(getGlobal(), 'adServers', previousAdServers);
    } else {
      delete getGlobal().adServers;
    }
  });

  it('identifies the GAM ad server vendor', function () {
    expect(gamSubmoduleFactory.vendorCode).to.equal(GAM_VENDOR);
  });

  it('returns the video ad tag URL built by GAM with the supplied auction inputs', function () {
    const adUnit = { code: 'video-slot' };
    const url = 'https://pubads.g.doubleclick.net/gampad/ads';
    const params = { iu: '/123/video' };
    const bid = { adId: 'winning-video-bid' };
    const expectedUrl = `${url}?iu=%2F123%2Fvideo`;
    gam.buildVideoUrl.returns(expectedUrl);

    expect(provider.getAdTagUrl(adUnit, url, params, bid)).to.equal(expectedUrl);
    sinon.assert.calledOnceWithExactly(gam.buildVideoUrl, { adUnit, url, params, bid });
    sinon.assert.calledOn(gam.buildVideoUrl, gam);
  });

  it('allows GAM to supply defaults when ad tag arguments are omitted', function () {
    gam.buildVideoUrl.returns('https://example.com/default-video');

    expect(provider.getAdTagUrl()).to.equal('https://example.com/default-video');
    sinon.assert.calledOnceWithExactly(gam.buildVideoUrl, {
      adUnit: undefined,
      url: undefined,
      params: undefined,
      bid: undefined
    });
  });

  it('resolves the VAST XML requested from GAM with the supplied auction inputs', async function () {
    const adUnit = { code: 'video-slot' };
    const url = 'https://pubads.g.doubleclick.net/gampad/ads';
    const params = { iu: '/123/video' };
    const bid = { adId: 'winning-video-bid' };
    const xml = '<VAST version="4.0"><Ad id="winning-video-bid"/></VAST>';
    gam.getVastXml.resolves(xml);

    expect(await provider.getVastXml(adUnit, url, params, bid)).to.equal(xml);
    sinon.assert.calledOnceWithExactly(gam.getVastXml, { adUnit, url, params, bid });
    sinon.assert.calledOn(gam.getVastXml, gam);
  });

  it('propagates rejected VAST requests to the caller', async function () {
    const error = new Error('GAM VAST request failed');
    gam.getVastXml.rejects(error);

    const result = await provider.getVastXml().then(
      () => { throw new Error('Expected the VAST request to reject'); },
      rejection => rejection
    );

    expect(result).to.equal(error);
  });

  it('rejects when GAM throws while starting a VAST request', async function () {
    const error = new Error('Invalid GAM request');
    gam.getVastXml.throws(error);

    const result = await provider.getVastXml().then(
      () => { throw new Error('Expected the VAST request to reject'); },
      rejection => rejection
    );

    expect(result).to.equal(error);
  });
});
