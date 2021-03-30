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
        id: {nextrollId: 'id_value'},
      },
      params: {partnerId: '1002'},
      localStorage: LS_VALUE
    },
    {
      expect: {id: undefined},
      params: {partnerId: '1003'},
      localStorage: LS_VALUE
    },
    {
      expect: {id: undefined},
      params: {partnerId: ''},
      localStorage: LS_VALUE
    },
    {
      expect: {id: undefined},
      params: {partnerId: '102'},
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
