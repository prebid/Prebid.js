import { mwOpenLinkSubModule, storage } from 'modules/mwOpenLinkIdSystem.js';

describe('mwOpenLinkId module', function () {
  beforeEach(function() {
    storage.setCookie('olid', '', 'Thu, 01 Jan 1970 00:00:00 GMT');
  });

  it('getId() should return a MediaWallah openLink id when the MediaWallah openLink first party cookie exists', function () {
    storage.setCookie('olid', 'XX-YY-ZZ-123');

    const id = mwOpenLinkSubModule.getId();
    expect(id).to.be.deep.equal({id: {mwOpenLinkId: 'P0-TestFPA'}});
  });

  it('getId() should return an empty id when the MediaWallah openLink first party cookie is missing', function () {
    const id = mwOpenLinkSubModule.getId();
    expect(id).to.be.deep.equal({id: undefined});
  });
});
