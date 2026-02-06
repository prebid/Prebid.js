import {describe, it} from 'mocha';
import {expect} from 'chai';
import {getDisclosureUrl} from '../../metadata/storageDisclosure.mjs';

describe('getDisclosureUrl', () => {
  let gvl;

  beforeEach(() => {
    gvl = null;
  });

  const getGvl = () => Promise.resolve(gvl);

  it('should not return url from gvl when vendor has deletedDate', async () => {
    gvl = {
      vendors: {
        '123': {
          deviceStorageDisclosureUrl: 'disclosure.url',
          deletedDate: '2024-06-11T00:00:00Z'
        }
      }
    };
    const url = await getDisclosureUrl(123, getGvl);
    expect(url).to.not.exist;
  });
});
