import {weakStore} from '../../../libraries/weakStore/weakStore.js';

describe('weakStore', () => {
  let targets, store;
  beforeEach(() => {
    targets = {
      id: {}
    };
    store = weakStore((id) => targets[id]);
  });

  it('returns undef if getter returns undef', () => {
    expect(store('missing')).to.not.exist;
  });

  it('inits to empty object by default', () => {
    expect(store('id')).to.eql({});
  });

  it('inits to given value', () => {
    expect(store('id', {initial: 'value'})).to.eql({'initial': 'value'});
  });

  it('returns the same object as long as the target does not change', () => {
    expect(store('id')).to.equal(store('id'));
  });

  it('ignores init value if already initialized', () => {
    store('id', {initial: 'value'});
    expect(store('id', {second: 'value'})).to.eql({initial: 'value'});
  })
});
