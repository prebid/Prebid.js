import { expect } from 'chai';
import { spec } from 'modules/ringieraxelspringerBidAdapter.js';

describe('ringieraxelspringer backward-compatibility shim', function () {
  it('should re-export spec from dasBidAdapter', function () {
    expect(spec).to.exist;
    expect(spec.code).to.equal('das');
    expect(spec.aliases).to.include('ringieraxelspringer');
  });
});
