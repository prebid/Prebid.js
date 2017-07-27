import { expect } from 'chai';
import { getGlobal } from 'src/prebidGlobal';
import { registerVideoSupport } from 'src/adServerManager';

const prebid = getGlobal();

describe('The ad server manager', () => {
  beforeEach(() => {
    delete prebid.adServers;
  });

  it('should register video support to the proper place on the API', () => {
    function videoSupport() { }
    registerVideoSupport('dfp', { buildVideoUrl: videoSupport });

    expect(prebid).to.have.property('adServers');
    expect(prebid.adServers).to.have.property('dfp');
    expect(prebid.adServers.dfp).to.have.property('buildVideoUrl', videoSupport);
  });

  it('should keep the first function when we try to add a second', () => {
    function videoSupport() { }
    registerVideoSupport('dfp', { buildVideoUrl: videoSupport });
    registerVideoSupport('dfp', { buildVideoUrl: function noop() { } });

    expect(prebid).to.have.property('adServers');
    expect(prebid.adServers).to.have.property('dfp');
    expect(prebid.adServers.dfp).to.have.property('buildVideoUrl', videoSupport);
  });
});
