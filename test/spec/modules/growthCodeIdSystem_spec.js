import { growthCodeIdSubmodule } from 'modules/growthCodeIdSystem.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import { uspDataHandler } from 'src/adapterManager.js';
import {expect} from 'chai';
import {getStorageManager} from '../../../src/storageManager.js';
import {MODULE_TYPE_UID} from '../../../src/activities/modules.js';

const MODULE_NAME = 'growthCodeId';
const EIDS = '[{"source":"domain.com","uids":[{"id":"8212212191539393121","ext":{"stype":"ppuid"}}]}]';
const GCID = 'e06e9e5a-273c-46f8-aace-6f62cf13ea71'

const GCID_EID = '{"id": [{"source": "growthcode.io", "uids": [{"atype": 3,"id": "e06e9e5a-273c-46f8-aace-6f62cf13ea71"}]}]}'
const GCID_EID_EID = '{"id": [{"source": "growthcode.io", "uids": [{"atype": 3,"id": "e06e9e5a-273c-46f8-aace-6f62cf13ea71"}]},{"source": "domain.com", "uids": [{"id": "8212212191539393121", "ext": {"stype":"ppuid"}}]}]}'

const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

const getIdParams = {params: {
  pid: 'TEST01',
  publisher_id: '_sharedid',
  publisher_id_storage: 'html5',
}};

describe('growthCodeIdSystem', () => {
  let logErrorStub;

  beforeEach(function () {
    logErrorStub = sinon.stub(utils, 'logError');
    storage.setDataInLocalStorage('gcid', GCID, null);
    storage.setDataInLocalStorage('customerEids', EIDS, null);
  });

  afterEach(function () {
    logErrorStub.restore();
  });

  describe('name', () => {
    it('should expose the name of the submodule', () => {
      expect(growthCodeIdSubmodule.name).to.equal('growthCodeId');
    });
  });

  it('test return of GCID', function () {
    let ids;
    ids = growthCodeIdSubmodule.getId();
    expect(ids).to.deep.equal(JSON.parse(GCID_EID));
  });

  it('test return of the GCID and an additional EID', function () {
    let ids;
    ids = growthCodeIdSubmodule.getId({params: {
      customerEids: 'customerEids',
    }});
    expect(ids).to.deep.equal(JSON.parse(GCID_EID_EID));
  });

  it('test return of the GCID and an additional EID (bad Local Store name)', function () {
    let ids;
    ids = growthCodeIdSubmodule.getId({params: {
      customerEids: 'customerEidsBad',
    }});
    expect(ids).to.deep.equal(JSON.parse(GCID_EID));
  });

  it('test decode function)', function () {
    let ids;
    ids = growthCodeIdSubmodule.decode(GCID, {params: {
      customerEids: 'customerEids',
    }});
    expect(ids).to.deep.equal(JSON.parse('{"growthCodeId":"' + GCID + '"}'));
  });
})
