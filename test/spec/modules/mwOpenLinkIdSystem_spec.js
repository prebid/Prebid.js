import { mwOpenLinkSubModule, readCookie, writeCookie } from 'modules/mwOpenLinkIdSystem.js';

describe('mwOpenLinkId module', function () {
  beforeEach(function() {
    writeCookie('mwol', '');
  });

  it('getId() should return a MediaWallah openLink id when the MediaWallah openLink first party cookie exists', function () {
    writeCookie('mwol', 'XX-YY-ZZ-123');

    const id = mwOpenLinkSubModule.getId();
    expect(id).to.be.deep.equal({id: {mwOlId: 'XX-YY-ZZ-123'}});
  });

  it('getId() should return an empty id when the MediaWallah openLink first party cookie is missing', function () {
    const id = mwOpenLinkSubModule.getId();
    expect(id).to.be.deep.equal({id: undefined});
  });
});
