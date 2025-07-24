import {metadataRepository} from '../../../libraries/metadata/metadata.js';

describe('metadata', () => {
  let metadata;
  beforeEach(() => {
    metadata = metadataRepository();
  });
  it('returns undefined when there is no metadata', () => {
    expect(metadata.getMetadata('bidder', 'missing')).to.not.exist;
  })
  it('can register and return component metadata', () => {
    const meta = {
      componentType: 'bidder',
      componentName: 'mock',
      disclosureURL: 'foo'
    }
    metadata.register('mockModule', {
      components: [meta]
    });
    expect(metadata.getMetadata('bidder', 'mock')).to.eql(meta);
  });
  it('can register and return storage disclosures', () => {
    const disclosure = {timestamp: 'mock', disclosures: ['foo', 'bar']};
    metadata.register('mockModule', {
      disclosures: {
        'mock.url': disclosure
      }
    });
    expect(metadata.getStorageDisclosure('mock.url')).to.eql(disclosure);
  });

  describe('getModuleMetadata', () => {
    it('returns null when no metadata is available for a module', () => {
      expect(metadata.getModuleMetadata('missing')).to.not.exist;
    });
    it('can retrieve metadata by module name', () => {
      const components = [
        {
          componentType: 'bidder',
          componentName: 'mock',
          disclosureURL: 'mock.url'
        }
      ]
      const disclosures = {
        'mock.url': {disclosures: ['foo', 'bar']}
      };
      metadata.register('mockModule', {
        components
      });
      metadata.register('someOtherModule', {
        disclosures
      });
      expect(metadata.getModuleMetadata('mockModule')).to.eql({
        disclosures,
        components
      })
    })
  })
})
