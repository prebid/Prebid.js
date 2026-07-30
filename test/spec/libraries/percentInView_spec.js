import {
  getViewportOffset,
  intersections,
  mkIntersectionHook,
  mkPrewarmHook,
  percentInView,
  viewportIntersections,
} from '../../../libraries/percentInView/percentInView.js';
import * as bbox from 'libraries/boundingClientRect/boundingClientRect';
import { enable, disable, enableFrameRect, disableFrameRect } from 'test/mocks/percentInView.js';

import { defer } from 'src/utils/promise.js';

describe('percentInView', () => {
  before(() => {
    disable();
  });
  after(() => {
    enable();
  });
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
            return { left: x, top: y };
          }
        };
        child = win;
        win = {};
        child.parent = win;
      }
      return leaf;
    }

    it('returns 0, 0 for the top window', () => {
      expect(getViewportOffset(mockWindow())).to.eql({ x: 0, y: 0 });
    });

    it('returns frame offset for a direct child', () => {
      expect(getViewportOffset(mockWindow([[10, 20]]))).to.eql({ x: 10, y: 20 });
    });
    it('returns cumulative offests for descendants', () => {
      expect(getViewportOffset(mockWindow([[10, 20], [20, 30]]))).to.eql({ x: 30, y: 50 });
    });
    it('does not choke when parent is not accessible', () => {
      const win = mockWindow([[10, 20]]);
      Object.defineProperty(win, 'frameElement', {
        get() {
          throw new Error();
        }
      });
      expect(getViewportOffset(win)).to.eql({ x: 0, y: 0 });
    });
  });

  async function delay(ms = 10) {
    await new Promise(resolve => setTimeout(resolve, ms));
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
      });
      obs = intersections(mkObserver);
    });
    describe('when mkObserver throws', () => {
      beforeEach(() => {
        mkObserver = sinon.stub().callsFake(() => {
          throw new Error();
        });
        obs = intersections(mkObserver);
      });
      it('getIntersection should return undef', () => {
        expect(obs.getIntersection({})).to.not.exist;
      });

      it('observe should resolve', async () => {
        await obs.observe({});
      });
    });

    it('observe should reject if the element cannot be observed', async () => {
      let err = new Error();
      nakedObs.observe.throws(err);
      try {
        await obs.observe({});
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
    });
    it('observe should resolve to latest intersection entry', () => {
      let pm = obs.observe(el);
      let entry = {
        target: el,
        time: 100
      };
      callback([entry, {
        target: el,
        time: 50
      }]);
      return pm.then(result => {
        expect(result).to.eql(entry);
      });
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
      });
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
    });
  });

  describe('intersection hook', () => {
    let intersections, hook, next, request;
    beforeEach(() => {
      next = sinon.stub();
      intersections = {
        observe: sinon.stub()
      };
      hook = mkIntersectionHook(intersections);
      request = {};
    });

    it('should observe elements for every ad unit', async () => {
      request.adUnits = [{
        element: 'el1'
      }, {
        code: 'el2'
      }];
      sandbox.stub(document, 'getElementById').returns('el2');
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

      it('should continue if promises never resolve', async () => {
        hook(next, request);
        await delay(100);
        sinon.assert.called(next);
      });

      it('should not delay if there are no elements to observe', async () => {
        request.adUnits = [];
        hook(next, request);
        await delay();
        sinon.assert.called(next);
      });
    });
  });

  describe('percentInView', () => {
    let intersection;
    beforeEach(() => {
      sandbox.stub(viewportIntersections, 'getIntersection').callsFake(() => intersection);
      sandbox.stub(viewportIntersections, 'observe');
      sandbox.stub(bbox, 'getBoundingClientRect');
    });

    it('does not use intersection ratio if w/h are relevant', () => {
      const element = {};
      intersection = {
        boundingClientRect: {
          width: 0,
          height: 0,
          left: -50,
          top: -100,
        },
        isIntersecting: true,
        intersectionRatio: 1
      };
      // a quarter of the overridden 100x200 size lies within the viewport
      expect(percentInView(element, { w: 100, h: 200 })).to.eql(25);
      // the observer already reported where the element is; measuring it again would
      // force a layout
      sinon.assert.neverCalledWith(bbox.getBoundingClientRect, element);
    });

    it('uses the intersection ratio when the element has an area', () => {
      intersection = {
        boundingClientRect: {
          width: 300,
          height: 250,
        },
        isIntersecting: true,
        intersectionRatio: 0.5
      };
      expect(percentInView({})).to.eql(50);
    });

    Object.entries({
      'height': { width: 300, height: 0 },
      'width': { width: 0, height: 250 },
    }).forEach(([dimension, boundingClientRect]) => {
      it(`returns 0 for an element with no ${dimension} and no size override`, () => {
        // intersection observers report a ratio of 1 for zero-area targets
        intersection = {
          boundingClientRect,
          isIntersecting: true,
          intersectionRatio: 1
        };
        expect(percentInView({})).to.eql(0);
      });
    });
  });

  describe('prewarm hook', () => {
    let intersections, hook, next, request;
    beforeEach(() => {
      next = sinon.stub();
      intersections = { observe: sinon.stub().resolves() };
      hook = mkPrewarmHook(intersections);
      request = {};
    });

    it('observes the element of every ad unit', () => {
      request.adUnits = [{ element: 'el1' }, { code: 'el2' }];
      sandbox.stub(document, 'getElementById').returns('el2');
      hook(next, request);
      sinon.assert.calledWith(intersections.observe, 'el1');
      sinon.assert.calledWith(intersections.observe, 'el2');
    });

    it('does not wait for the observations to resolve', () => {
      let observed;
      intersections.observe.returns(new Promise((resolve) => { observed = resolve; }));
      request.adUnits = [{ element: 'el1' }];
      hook(next, request);
      sinon.assert.calledWith(next, request);
      observed();
    });

    it('continues when an element cannot be observed', async () => {
      intersections.observe.rejects(new Error());
      request.adUnits = [{ element: 'el1' }];
      hook(next, request);
      sinon.assert.calledWith(next, request);
      // give the rejection a chance to surface as an unhandled rejection
      await delay();
    });

    it('does not choke on a request with no ad units', () => {
      hook(next, request);
      sinon.assert.notCalled(intersections.observe);
      sinon.assert.calledWith(next, request);
    });
  });

  describe('frame rect mock', () => {
    // only applies when karma runs the tests in an iframe, which excludes the debug page
    if (window.frameElement == null) return;

    afterEach(() => {
      enableFrameRect();
    });

    it('reports the top window viewport while enabled', () => {
      const { left, top, width, height } = window.frameElement.getBoundingClientRect();
      const doc = window.top.document.documentElement;
      expect({ left, top, width, height }).to.eql({
        left: 0, top: 0, width: doc.clientWidth, height: doc.clientHeight
      });
    });

    it('reports the real frame rect once disabled', () => {
      disableFrameRect();
      // the frame element belongs to the containing document, so its rect comes from that realm
      const { DOMRect } = window.frameElement.ownerDocument.defaultView;
      expect(window.frameElement.getBoundingClientRect()).to.be.instanceOf(DOMRect);
    });
  });

  describe('percentInView, with no intersection available', () => {
    let container;

    beforeEach(() => {
      // no intersection entry, so the measurement runs off the DOM
      sandbox.stub(viewportIntersections, 'getIntersection').returns(undefined);
      sandbox.stub(viewportIntersections, 'observe');
      bbox.clearCache();
      container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:0;top:0';
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
      bbox.clearCache();
    });

    function measure(html) {
      container.innerHTML = html;
      bbox.clearCache();
      return percentInView(container.querySelector('#target'));
    }

    const TARGET = '<div id="target" style="width:50px;height:50px"></div>';

    it('is clipped by an overflow-hidden ancestor', () => {
      const unclipped = measure(TARGET);
      expect(unclipped).to.be.greaterThan(0);
      const clipped = measure(`<div style="overflow:hidden;width:50px;height:25px">${TARGET}</div>`);
      expect(clipped).to.be.greaterThan(0);
      expect(clipped).to.be.lessThan(unclipped);
    });

    it('returns 0 for an element held entirely outside an overflow-hidden ancestor', () => {
      expect(measure(
        `<div style="overflow:hidden;width:50px;height:25px">
           <div style="position:relative;top:200px">${TARGET}</div>
         </div>`
      )).to.eql(0);
    });

    it('returns 0 for an element scrolled out of a scrolling ancestor', () => {
      expect(measure(
        `<div style="overflow:auto;width:50px;height:25px">
           <div style="height:400px"></div>${TARGET}
         </div>`
      )).to.eql(0);
    });

    Object.entries({
      'visibility:hidden': 'visibility:hidden',
      'opacity:0': 'opacity:0',
    }).forEach(([label, css]) => {
      it(`returns 0 for an element with ${label}`, () => {
        expect(measure(`<div id="target" style="width:50px;height:50px;${css}"></div>`)).to.eql(0);
      });

      it(`returns 0 for an element under an ancestor with ${label}`, () => {
        expect(measure(`<div style="${css}">${TARGET}</div>`)).to.eql(0);
      });
    });
  });
});
