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
    metadata.register({
      components: [meta]
    });
    expect(metadata.getMetadata('bidder', 'mock')).to.eql(meta);
  });
  it('can register and return storage disclosures', () => {
    const disclosure = ['foo', 'bar'];
    metadata.register({
      disclosures: {
        'mock.url': disclosure
      }
    });
    expect(metadata.getStorageDisclosure('mock.url')).to.eql(disclosure);
  })
})
