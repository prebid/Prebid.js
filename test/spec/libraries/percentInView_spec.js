import {getViewportOffset} from '../../../libraries/percentInView/percentInView.js';

describe('percentInView', () => {
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
});
