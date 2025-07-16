import { expect } from 'chai';
import { getGlobal } from 'src/prebidGlobal.js';
import { registerVideoSupport } from 'src/adServerManager.js';

const prebid = getGlobal();

describe('The ad server manager', function () {
  before(function () {
    delete prebid.adServers;
  });

  afterEach(function () {
    delete prebid.adServers;
  });

  it('should register video support to the proper place on the API', function () {
    function videoSupport() { }
    registerVideoSupport('gam', { buildVideoUrl: videoSupport });

    expect(prebid).to.have.property('adServers');
    expect(prebid.adServers).to.have.property('gam');
    expect(prebid.adServers.gam).to.have.property('buildVideoUrl', videoSupport);
  });

  it('should keep the first function when we try to add a second', function () {
    function videoSupport() { }
    registerVideoSupport('gam', { buildVideoUrl: videoSupport });
    registerVideoSupport('gam', { buildVideoUrl: function noop() { } });

    expect(prebid).to.have.property('adServers');
    expect(prebid.adServers).to.have.property('gam');
    expect(prebid.adServers.gam).to.have.property('buildVideoUrl', videoSupport);
  });

  it('should support any custom named property in the public API', function () {
    function getTestAdServerTargetingKeys() { };
    registerVideoSupport('testAdServer', { getTargetingKeys: getTestAdServerTargetingKeys });

    expect(prebid).to.have.property('adServers');
    expect(prebid.adServers).to.have.property('testAdServer');
    expect(prebid.adServers.testAdServer).to.have.property('getTargetingKeys', getTestAdServerTargetingKeys);
  });
});
