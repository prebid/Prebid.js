import { writeCookie, mwOpenLinkSubModule } from 'modules/mwOpenLinkIdSystem.js';

const P_CONFIG_MOCK = {
  params: {
    accountId: '123',
    partnerId: '123'
  }
};

describe('mwOpenLinkId module', function () {
  beforeEach(function() {
    writeCookie('');
  });

  it('getId() should return a MediaWallah openLink Id when the MediaWallah openLink first party cookie exists', function () {
    writeCookie({eid: 'XX-YY-ZZ-123'});
    const id = mwOpenLinkSubModule.getId(P_CONFIG_MOCK);
    expect(id).to.be.deep.equal({id: {eid: 'XX-YY-ZZ-123'}});
  });

  it('getId() should return an empty Id when the MediaWallah openLink first party cookie is missing', function () {
    const id = mwOpenLinkSubModule.getId();
    expect(id).to.be.deep.equal(undefined);
  });
});
