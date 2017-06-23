import { expect } from 'chai';
import { getGlobal } from 'src/prebidGlobal';
import { registerVideoSupport } from 'src/adServerManager';

const prebid = getGlobal();

describe('The ad server manager', () => {
  beforeEach(() => {
    delete prebid.adServer;
    delete prebid.adServers;
  });

  it('should register video support to the proper place when one ad server is loaded', () => {
    function videoSupport() { }
    registerVideoSupport('dfp', { buildVideoAdUrl: videoSupport });

    expect(prebid).to.have.property('adServer');
    expect(prebid.adServer).to.have.property('code');
    expect(prebid.adServer.code).to.equal('dfp');

    expect(prebid.adServer).to.have.property('buildVideoAdUrl');
    expect(prebid.adServer.buildVideoAdUrl).to.equal(videoSupport);
  });

  it('should change the namespaces when two ad servers are loaded', () => {
    function dfpVideoSupport() { }
    function astVideoSupport() { }
    registerVideoSupport('ast', { buildVideoAdUrl: astVideoSupport });
    registerVideoSupport('dfp', { buildVideoAdUrl: dfpVideoSupport });

    expect(prebid).to.not.have.property('adServer');
    expect(prebid).to.have.property('adServers');

    expect(prebid.adServers).to.have.property('ast');
    expect(prebid.adServers.ast).to.have.property('buildVideoAdUrl');
    expect(prebid.adServers).to.have.property('dfp');
    expect(prebid.adServers.dfp).to.have.property('buildVideoAdUrl');
    expect(prebid.adServers.ast).not.to.have.property('code');
    expect(prebid.adServers.dfp).not.to.have.property('code');

    expect(prebid.adServers.dfp.buildVideoAdUrl).to.equal(dfpVideoSupport);
    expect(prebid.adServers.ast.buildVideoAdUrl).to.equal(astVideoSupport);
  });
});
