import { nextrollIdSubmodule, storage } from 'modules/nextrollIdSystem.js';

const LS_VALUE = `{
  "AdID":{"id":"adid","key":"AdID"},
  "AdID:1002": {"id":"adid","key":"AdID:1002","value":"id_value"}}`;

describe('NextrollId module', function () {
  let sandbox = sinon.sandbox.create();
  let hasLocalStorageStub;
  let getLocalStorageStub;

  beforeEach(function() {
    hasLocalStorageStub = sandbox.stub(storage, 'hasLocalStorage');
    getLocalStorageStub = sandbox.stub(storage, 'getDataFromLocalStorage');
  });

  afterEach(function () {
    sandbox.restore();
  })

  const testCases = [
    {
      expect: {
        id: {nextroll: 'id_value'},
      },
      params: {partner_id: '1002'},
      localStorage: LS_VALUE
    },
    {
      expect: {id: undefined},
      params: {partner_id: '1003'},
      localStorage: LS_VALUE
    },
    {
      expect: {id: undefined},
      params: {partner_id: ''},
      localStorage: LS_VALUE
    },
    {
      expect: {id: undefined},
      params: {partner_id: '102'},
      localStorage: undefined
    },
    {
      expect: {id: undefined},
      params: undefined,
      localStorage: undefined
    }
  ]
  testCases.forEach(
    (testCase, i) => it(`getId() (TC #${i}) should return the nextroll id if it exists`, function () {
      getLocalStorageStub.withArgs('dca0.com').returns(testCase.localStorage);
      const id = nextrollIdSubmodule.getId({params: testCase.params});
      expect(id).to.be.deep.equal(testCase.expect);
    }))
});
