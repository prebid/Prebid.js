import {getStorageDisclosureSummary} from '../../../libraries/storageDisclosure/summary.js';

describe('storageDisclosure', () => {
  let moduleMeta;
  beforeEach(() => {
    moduleMeta = {};
  });

  function getSummary() {
    return getStorageDisclosureSummary(Object.keys(moduleMeta), (name) => moduleMeta[name]);
  }

  it('should not choke when metadata is not available for a module', () => {
    expect(getStorageDisclosureSummary(['missing'], () => null)).to.eql([]);
  });

  it('should list disclosures', () => {
    moduleMeta = {
      module1: {
        disclosures: {
          url1: [
            {identifier: 'foo'}
          ]
        }
      },
      module2: {
        disclosures: {
          url2: [
            {identifier: 'bar'}
          ]
        }
      }
    }
    expect(getSummary()).to.eql([
      {
        disclosedIn: 'url1',
        disclosedBy: ['module1'],
        identifier: 'foo'
      },
      {
        disclosedIn: 'url2',
        disclosedBy: ['module2'],
        identifier: 'bar'
      }
    ])
  });

  it('should group by disclosure URL', () => {
    const disclosures = {
      url: [
        {identifier: 'foo'}
      ]
    }
    moduleMeta = {
      module1: {
        disclosures
      },
      module2: {
        disclosures
      }
    };
    expect(getSummary()).to.eql([
      {
        disclosedIn: 'url',
        disclosedBy: ['module1', 'module2'],
        identifier: 'foo'
      }
    ])
  })
})

