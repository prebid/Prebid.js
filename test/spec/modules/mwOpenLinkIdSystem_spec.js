import { mwOpenLinkSubModule } from 'modules/mwOpenLinkIdSystem.js';
import { newStorageManager } from 'src/storageManager.js';

const storage = newStorageManager();

const P_CONFIG_MOCK = {
  params: {
    accountId: '123',
    partnerId: '123',
    storage: true
  }
};

function serializeMWOLId(mwOLId) {
  let components = [];

  if (mwOLId.eid) {
    components.push('eid:' + mwOLId.eid);
  }
  if (mwOLId.ibaOptout) {
    components.push('ibaOptout:1');
  }
  if (mwOLId.ccpaOptout) {
    components.push('ccpaOptout:1');
  }

  return components.join(',');
}

function writeMwOpenLinkIdCookie(name, mwOLId) {
  if (mwOLId) {
    const mwOLIdStr = encodeURIComponent(serializeMWOLId(mwOLId));
    storage.setCookie(
      name,
      mwOLIdStr,
      (new Date(Date.now() + 5000).toUTCString()),
      'lax');
  }
}

describe('mwOpenLinkId module', function () {
  beforeEach(function() {
    writeMwOpenLinkIdCookie('mwol', '');
  });

  it('getId() should return a MediaWallah openLink Id when the MediaWallah openLink first party cookie exists', function () {
    writeMwOpenLinkIdCookie('mwol', {eid: 'XX-YY-ZZ-123'});

    const id = mwOpenLinkSubModule.getId(P_CONFIG_MOCK.params, null, null);
    expect(id).to.be.deep.equal({id: {eid: 'XX-YY-ZZ-123'}});
  });

  it('getId() should return an empty Id when the MediaWallah openLink first party cookie is missing', function () {
    const id = mwOpenLinkSubModule.getId();
    expect(id).to.be.deep.equal({id: undefined});
  });
});
