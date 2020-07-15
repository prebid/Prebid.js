import { expect } from 'chai';
import {haloIdSubmodule} from 'modules/haloIdSystem.js';

describe('HaloID Submodule', () => {
  const haloId = '1F95D0CB-0513-4BAC-8B3A-168A652B24D3';
  const getter_override = function(params) {
    return { 'haloId': haloId };
  };

  it('test getter override with value', () => {
    const response = haloIdSubmodule.getId({ getter: getter_override });
    assert.deepEqual(response, { id: { 'haloId': haloId } });
  });
});
