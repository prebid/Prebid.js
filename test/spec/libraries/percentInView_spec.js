import {
  getViewportOffset,
  intersections, mkIntersectionHook, percentInView, viewportIntersections,
} from '../../../libraries/percentInView/percentInView.js';
import * as bbox from 'libraries/boundingClientRect/boundingClientRect';

import {defer} from 'src/utils/promise.js';
import {getBoundingClientRect} from 'libraries/boundingClientRect/boundingClientRect';

describe('percentInView', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe('getViewportOffset', () => {
    function mockWindow(offsets = []) {
      let win, leaf, child;
      win = leaf = {};
      for (const [x, y] of offsets) {
        win.frameElement = {
          getBoundingClientRect() {
            return {left: x, top: y};
          }
        };
        child = win;
        win = {};
        child.parent = win;
      }
      return leaf;
    }
    it('returns 0, 0 for the top window', () => {
      expect(getViewportOffset(mockWindow())).to.eql({x: 0, y: 0});
    });

    it('returns frame offset for a direct child', () => {
      expect(getViewportOffset(mockWindow([[10, 20]]))).to.eql({x: 10, y: 20});
    });
    it('returns cumulative offests for descendants', () => {
      expect(getViewportOffset(mockWindow([[10, 20], [20, 30]]))).to.eql({x: 30, y: 50});
    });
    it('does not choke when parent is not accessible', () => {
      const win = mockWindow([[10, 20]]);
      Object.defineProperty(win, 'frameElement', {
        get() {
          throw new Error();
        }
      });
      expect(getViewportOffset(win)).to.eql({x: 0, y: 0});
    });
  });

  async function delay() {
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  describe('intersections', () => {
    let callback, obs, nakedObs, mkObserver, el;
    beforeEach(() => {
      el = document.createElement('div');
      nakedObs = sinon.stub();
      nakedObs.observe = sinon.stub();
      mkObserver = sinon.stub().callsFake((cb) => {
        callback = cb;
        return nakedObs;
      })
      obs = intersections(mkObserver);
    })

    it('observe should reject if the element cannot be observed', async () => {
      let err = new Error();
      nakedObs.observe.throws(err);
      try {
        await obs.observe(null);
      } catch (e) {
        expect(e).to.eql(err);
        return;
      }
      sinon.assert.fail('promise should reject');
    });
    it('does not observe the same element more than once', () => {
      obs.observe(el);
      obs.observe(el);
      sinon.assert.calledOnce(nakedObs.observe);
    });
    it('getIntersection should return undefined if the element is not observed', () => {
      expect(obs.getIntersection(el)).to.not.exist;
    })
    it('observe should resolve to latest intersection entry', () => {
      let pm = obs.observe(el);
      let entry = {
        target: el,
        time: 100
      }
      callback([entry, {
        target: el,
        time: 50
      }]);
      return pm.then(result => {
        expect(result).to.eql(entry);
      })
    });
    it('observe should resolve immediately if an entry is available', () => {
      const entry = {
        target: el,
        time: 10
      };
      callback([entry]);
      const pm = obs.observe(el);
      callback([{
        target: el,
        time: 20
      }]);
      return pm.then((result) => {
        expect(result).to.eql(entry);
      })
    });
    it('should ignore stale entries', async () => {
      const entry = {
        target: el,
        time: 100
      };
      obs.observe(el);
      callback([entry]);
      callback([{
        target: el,
        time: 10
      }]);
      expect(obs.getIntersection(el)).to.eql(entry);
    });

    it('should not resolve until the targeted element has intersected', async () => {
      const entry = {
        target: el,
        time: 100
      };
      const pm = obs.observe(el);
      callback([{
        target: {},
        time: 20
      }]);
      await delay();
      callback([entry]);
      expect(await pm).to.eql(entry);
    })
  });

  describe('intersection hook', () => {
    let intersections, hook, next, request;
    beforeEach(() => {
      next = sinon.stub();
      intersections = {
        observe: sinon.stub()
      }
      hook = mkIntersectionHook(intersections);
      request = {};
    });

    it('should observe elements for every ad unit', async () => {
      request.adUnits = [{
        element: 'el1'
      }, {
        code: 'el2'
      }];
      sandbox.stub(document, 'getElementById').returns('el2')
      hook(next, request);
      sinon.assert.calledWith(intersections.observe, 'el1');
      sinon.assert.calledWith(intersections.observe, 'el2');
      await delay();
      sinon.assert.calledWith(next, request);
    });

    describe('promise resolution', () => {
      let adUnits;
      beforeEach(() => {
        adUnits = {
          el1: {
            element: 'el1',
            df: defer()
          },
          el2: {
            element: 'el2',
            df: defer()
          }
        };
        request.adUnits = Object.values(adUnits);
        intersections.observe.callsFake((element) => adUnits[element].df.promise);
      });
      it('should wait for all promises to resolve', async () => {
        hook(next, request);
        sinon.assert.notCalled(next);
        adUnits.el1.df.resolve();
        await delay();
        sinon.assert.notCalled(next);
        adUnits.el2.df.resolve();
        await delay();
        sinon.assert.calledWith(next, request);
      });

      it('should still continue if some promises reject', async () => {
        hook(next, request);
        adUnits.el1.df.reject();
        await delay();
        sinon.assert.notCalled(next);
        adUnits.el2.df.resolve();
        await delay();
        sinon.assert.calledWith(next, request);
      });
    });
  });

  describe('percentInView', () => {
    let intersection;
    beforeEach(() => {
      sinon.stub(viewportIntersections, 'getIntersection').callsFake(() => intersection);
      sinon.stub(viewportIntersections, 'observe');
      sinon.stub(bbox, 'getBoundingClientRect');
    });

    it('does not use intersection if w/h are relevant', () => {
      bbox.getBoundingClientRect.returns({
        width: 0,
        height: 0,
        left: -50,
        top: -100,
      })
      intersection = {
        boundingClientRect: {
          width: 0,
          height: 0,
        },
        isIntersecting: true,
        intersectionRatio: 1
      }
      expect(percentInView({}, {w: 100, h: 200})).to.not.eql(100);
    })
  })
});
