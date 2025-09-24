import {CachedApiWrapper} from '../../../src/utils/cachedApiWrapper.js';

describe('cachedApiWrapper', () => {
  let target, child, wrapper;
  beforeEach(() => {
    target = {};
    child = {};
    wrapper = new CachedApiWrapper(() => target, ['prop1'], {
      child: new CachedApiWrapper(() => child, ['prop2'])
    });
  });

  it('should delegate to target', () => {
    target.prop1 = 'value';
    expect(wrapper.obj.prop1).to.eql('value');
  });
  it('should cache result', () => {
    target.prop1 = 'value';
    expect(wrapper.obj.prop1).to.eql('value');
    target.prop1 = 'newValue';
    expect(wrapper.obj.prop1).to.eql('value');
  });

  it('should clear cache on reset', () => {
    target.prop1 = 'value';
    expect(wrapper.obj.prop1).to.eql('value');
    target.prop1 = 'newValue';
    wrapper.reset();
    expect(wrapper.obj.prop1).to.eql('newValue');
  });

  it('should unwrap wrappers in obj', () => {
    child.prop2 = 'value';
    expect(wrapper.obj.child.prop2).to.eql('value');
    child.prop2 = 'newValue';
    expect(wrapper.obj.child.prop2).to.eql('value');
  });

  it('should reset childrens cache', () => {
    child.prop2 = 'value';
    expect(wrapper.obj.child.prop2).to.eql('value');
    wrapper.reset();
    child.prop2 = 'newValue';
    expect(wrapper.obj.child.prop2).to.eql('newValue');
  })
})
