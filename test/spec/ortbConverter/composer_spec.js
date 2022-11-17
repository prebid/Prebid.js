import {compose} from '../../../libraries/ortbConverter/lib/composer.js';

describe('compose', () => {
  it('runs each component in order of priority', () => {
    const order = [];
    const components = {
      first: {
        fn: sinon.stub().callsFake(() => order.push(1)),
      },
      second: {
        fn: sinon.stub().callsFake(() => order.push(2)),
        priority: 10
      },
      third: {
        fn: sinon.stub().callsFake(() => order.push(3)),
        priority: 5
      }
    };
    compose(components)();
    expect(order).to.eql([2, 3, 1]);
  });

  it('passes parameters to each component', () => {
    const components = {
      first: {
        fn: sinon.stub()
      },
      second: {
        fn: sinon.stub()
      }
    };
    compose(components)('one', 'two');
    Object.values(components).forEach(comp => {
      sinon.assert.calledWith(comp.fn, 'one', 'two')
    })
  })

  it('respects overrides', () => {
    const components = {
      first: {
        fn: sinon.stub()
      },
      second: {
        fn: sinon.stub()
      }
    };
    const overrides = {
      second: sinon.stub()
    }
    compose(components, overrides)('one', 'two');
    sinon.assert.calledWith(overrides.second, components.second.fn, 'one', 'two')
  })

  it('disables components when override is false', () => {
    const components = {
      first: {
        fn: sinon.stub(),
      },
      second: {
        fn: sinon.stub()
      }
    };
    const overrides = {
      second: false
    };
    compose(components, overrides)('one', 'two');
    sinon.assert.notCalled(components.second.fn);
  })
});
