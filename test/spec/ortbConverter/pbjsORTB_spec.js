import {
  DEFAULT,
  PBS,
  PROCESSOR_TYPES,
  processorRegistry,
  REQUEST
} from '../../../src/pbjsORTB.js';

describe('pbjsORTB register / get processors', () => {
  let registerOrtbProcessor, getProcessors;
  beforeEach(() => {
    ({registerOrtbProcessor, getProcessors} = processorRegistry());
  })
  PROCESSOR_TYPES.forEach(type => {
    it(`can get and set ${type} processors`, () => {
      const proc = function () {};
      registerOrtbProcessor({
        type,
        name: 'test',
        fn: proc
      });
      expect(getProcessors(DEFAULT)).to.eql({
        [type]: {
          test: {
            priority: 0,
            fn: proc
          }
        }
      });
    });
  });

  it('throws on wrong type', () => {
    expect(() => registerOrtbProcessor({
      type: 'incorrect',
      name: 'test',
      fn: function () {}
    })).to.throw();
  });

  it('can set priority', () => {
    const proc = function () {};
    registerOrtbProcessor({type: REQUEST, name: 'test', fn: proc, priority: 10});
    expect(getProcessors(DEFAULT)).to.eql({
      [REQUEST]: {
        test: {
          priority: 10,
          fn: proc
        }
      }
    })
  });

  it('can assign processors to specific dialects', () => {
    const proc = function () {};
    registerOrtbProcessor({type: REQUEST, name: 'test', fn: proc, dialects: [PBS]});
    expect(getProcessors(DEFAULT)).to.eql({});
    expect(getProcessors(PBS)).to.eql({
      [REQUEST]: {
        test: {
          priority: 0,
          fn: proc
        }
      }
    })
  });
});
