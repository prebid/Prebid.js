import { CachedApiWrapper, LIVE } from '../../../src/utils/cachedApiWrapper.js';

describe('cachedApiWrapper', () => {
  let target, child, grandchild, wrapper;
  beforeEach(() => {
    grandchild = {};
    child = {
      grandchild
    };
    target = {
      child
    };
    wrapper = new CachedApiWrapper(() => target, {
      prop1: true,
      liveProp: LIVE,
      child: {
        prop2: true,
        grandchild: {
          prop3: true
        }
      }
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
    grandchild.prop3 = 'value';
    expect(wrapper.obj.child.grandchild.prop3).to.eql('value');
    grandchild.prop3 = 'value';
    expect(wrapper.obj.child.grandchild.prop3).to.eql('value');
  });

  it('should reset childrens cache', () => {
    child.prop2 = 'value';
    expect(wrapper.obj.child.prop2).to.eql('value');
    wrapper.reset();
    child.prop2 = 'newValue';
    expect(wrapper.obj.child.prop2).to.eql('newValue');
  });

  describe('LIVE properties', () => {
    it('should not cache the result', () => {
      target.liveProp = 'value';
      expect(wrapper.obj.liveProp).to.eql('value');
      target.liveProp = 'newValue';
      expect(wrapper.obj.liveProp).to.eql('newValue');
    });

    it('should stay live across reset()', () => {
      target.liveProp = 'value';
      expect(wrapper.obj.liveProp).to.eql('value');
      wrapper.reset();
      target.liveProp = 'newValue';
      expect(wrapper.obj.liveProp).to.eql('newValue');
    });
  });
});
