import {
  ratioToPercentageCeil,
  merge,
  getDocumentHeight,
  getOffset,
  getWindowParents,
  getRectCuts,
  getTopmostReachableWindow,
  topDocumentIsReachable,
  isInsideIframe,
  isInsideSafeframe,
  getIframeType,
  get
} from "modules/viBidAdapter";

describe("ratioToPercentageCeil", () => {
  it("1 converts to percentage", () =>
    expect(ratioToPercentageCeil(0.01)).to.equal(1));
  it("2 converts to percentage", () =>
    expect(ratioToPercentageCeil(0.00000000001)).to.equal(1));
  it("3 converts to percentage", () =>
    expect(ratioToPercentageCeil(0.5)).to.equal(50));
  it("4 converts to percentage", () =>
    expect(ratioToPercentageCeil(1)).to.equal(100));
  it("5 converts to percentage", () =>
    expect(ratioToPercentageCeil(0.99)).to.equal(99));
  it("6 converts to percentage", () =>
    expect(ratioToPercentageCeil(0.990000000000001)).to.equal(100));
});

describe("merge", () => {
  it("merges two objects", () => {
    expect(
      merge({ a: 1, b: 2, d: 0 }, { a: 2, b: 2, c: 3 }, (a, b) => a + b)
    ).to.deep.equal({ a: 3, b: 4, c: 3, d: 0 });
  });
});

describe("getDocumentHeight", () => {
  [
    {
      curDocument: {
        body: {
          clientHeight: 0,
          offsetHeight: 0,
          scrollHeight: 0
        },
        documentElement: {
          clientHeight: 0,
          offsetHeight: 0,
          scrollHeight: 0
        }
      },
      expected: 0
    },
    {
      curDocument: {
        body: {
          clientHeight: 0,
          offsetHeight: 13,
          scrollHeight: 24
        },
        documentElement: {
          clientHeight: 0,
          offsetHeight: 0,
          scrollHeight: 0
        }
      },
      expected: 24
    },
    {
      curDocument: {
        body: {
          clientHeight: 0,
          offsetHeight: 13,
          scrollHeight: 24
        },
        documentElement: {
          clientHeight: 100,
          offsetHeight: 50,
          scrollHeight: 30
        }
      },
      expected: 100
    }
  ].forEach(({ curDocument, expected }) =>
    expect(getDocumentHeight(curDocument)).to.be.equal(expected)
  );
});

describe("getOffset", () => {
  [
    {
      element: {
        ownerDocument: {
          defaultView: {
            pageXOffset: 0,
            pageYOffset: 0
          }
        },
        getBoundingClientRect: () => ({
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        })
      },
      expected: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    }
  ].forEach(({ description, element, expected }, i) =>
    it(
      "returns element offsets from the document edges (including scroll): " +
        i,
      () => expect(getOffset(element)).to.be.deep.equal(expected)
    )
  );
  it("Throws when there is no window", () =>
    expect(
      getOffset.bind(null, {
        ownerDocument: {
          defaultView: null
        },
        getBoundingClientRect: () => ({
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        })
      })
    ).to.throw());
});

describe("getWindowParents", () => {
  const win = {};
  win.top = win;
  win.parent = win;
  const win1 = { top: win, parent: win };
  const win2 = { top: win, parent: win1 };
  const win3 = { top: win, parent: win2 };

  it("get parents up to the top", () =>
    expect(getWindowParents(win3)).to.be.deep.equal([win2, win1, win]));
});

describe("getTopmostReachableWindow", () => {
  const win = {};
  win.top = win;
  win.parent = win;
  const win1 = { top: win, parent: win };
  const win2 = { top: win, parent: win1 };
  const win3 = { top: win, parent: win2 };

  it("get parents up to the top", () =>
    expect(getTopmostReachableWindow(win3)).to.be.equal(win));
});

const topWindow = { document };
topWindow.top = topWindow;
topWindow.parent = topWindow;
const frameWindow1 = { top: topWindow, parent: topWindow };
const frameWindow2 = { top: topWindow, parent: frameWindow1 };
const frameWindow3 = { top: topWindow, parent: frameWindow2 };

describe("topDocumentIsReachable", () => {
  it("returns true if it can access top document", () =>
    expect(topDocumentIsReachable(frameWindow3)).to.be.true);
});

describe("isInsideIframe", () => {
  it("returns true if window !== window.top", () =>
    expect(isInsideIframe(topWindow)).to.be.false);
  it("returns true if window !== window.top", () =>
    expect(isInsideIframe(frameWindow1)).to.be.true);
});

const safeframeWindow = { $sf: {} };

describe("isInsideSafeframe", () => {
  it("returns true if top window is not reachable and window.$sf is defined", () =>
    expect(isInsideSafeframe(safeframeWindow)).to.be.true);
});

const hostileFrameWindow = {}

describe("getIframeType", () => {
  it("returns undefined when is not inside iframe", () =>
    expect(getIframeType(topWindow)).to.be.undefined);
  it("returns 'safeframe' when inside sf", () =>
    expect(getIframeType(safeframeWindow)).to.be.equal("safeframe"));
  it("returns 'friendly' when inside friendly iframe and can reach top window", () =>
    expect(getIframeType(frameWindow3)).to.be.equal("friendly"));
  it("returns 'hostile' when cannot get top window", () =>
    expect(getIframeType(hostileFrameWindow)).to.be.equal("hostile"));
});

describe("getCuts without vCuts", () => {
  const cases = {
    "completely in view 1": {
      top: 0,
      bottom: 200,
      right: 200,
      left: 0,
      vw: 300,
      vh: 300,
      expected: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    },
    "completely in view 2": {
      top: 100,
      bottom: 200,
      right: 200,
      left: 0,
      vw: 300,
      vh: 300,
      expected: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    },
    "half cut from the top": {
      top: -200,
      bottom: 200,
      right: 200,
      left: 0,
      vw: 300,
      vh: 300,
      expected: {
        top: -200,
        right: 0,
        bottom: 0,
        left: 0
      }
    },
    "half cut from the bottom": {
      top: 0,
      bottom: 600,
      right: 200,
      left: 0,
      vw: 300,
      vh: 300,
      expected: {
        top: 0,
        right: 0,
        bottom: -300,
        left: 0
      }
    },
    "quarter cut from top and bottom": {
      top: -25,
      bottom: 75,
      right: 200,
      left: 0,
      vw: 300,
      vh: 50,
      expected: {
        top: -25,
        right: 0,
        bottom: -25,
        left: 0
      }
    },
    "out of view top": {
      top: -200,
      bottom: -5,
      right: 200,
      left: 0,
      vw: 300,
      vh: 200,
      expected: {
        top: -200,
        right: 0,
        bottom: 0,
        left: 0
      }
    },
    "out of view bottom": {
      top: 250,
      bottom: 500,
      right: 200,
      left: 0,
      vw: 300,
      vh: 200,
      expected: {
        top: 0,
        right: 0,
        bottom: -300,
        left: 0
      }
    },
    "half cut from left": {
      top: 0,
      bottom: 200,
      left: -200,
      right: 200,
      vw: 300,
      vh: 300,
      expected: {
        top: 0,
        right: 0,
        bottom: 0,
        left: -200
      }
    },
    "half cut from left and top": {
      top: -100,
      bottom: 100,
      left: -200,
      right: 200,
      vw: 300,
      vh: 300,
      expected: {
        top: -100,
        right: 0,
        bottom: 0,
        left: -200
      }
    },
    "quarter cut from all sides": {
      top: -100,
      left: -100,
      bottom: 300,
      right: 300,
      vw: 200,
      vh: 200,
      expected: {
        top: -100,
        right: -100,
        bottom: -100,
        left: -100
      }
    }
  };
  for (let descr in cases) {
    it(descr, () => {
      const { expected, vh, vw, ...rect } = cases[descr];
      expect(getRectCuts(rect, vh, vw)).to.deep.equal(expected);
    });
  }
});

describe("getCuts with vCuts", () => {
  const cases = {
    "completely in view 1, half-cut viewport from top": {
      top: 0,
      right: 200,
      bottom: 200,
      left: 0,
      vw: 200,
      vh: 200,
      vCuts: {
        top: -100,
        right: 0,
        bottom: 0,
        left: 0
      },
      expected: {
        top: -100,
        right: 0,
        bottom: 0,
        left: 0
      }
    },
    "completely in view 2, half-cut viewport from bottom": {
      top: 100,
      bottom: 200,
      right: 200,
      left: 0,
      vw: 300,
      vh: 300,
      vCuts: {
        top: 0,
        right: 0,
        bottom: -150,
        left: 0
      },
      expected: {
        top: 0,
        right: 0,
        bottom: -50,
        left: 0
      }
    },
    "half cut from the top, 1/3 viewport cut from the bottom": {
      top: -200,
      bottom: 200,
      right: 200,
      left: 0,
      vw: 300,
      vh: 300,
      vCuts: {
        top: 0,
        right: 0,
        bottom: -100,
        left: 0
      },
      expected: {
        top: -200,
        right: 0,
        bottom: 0,
        left: 0
      }
    },
    "half cut from the bottom": {
      top: 0,
      bottom: 600,
      right: 200,
      left: 0,
      vw: 300,
      vh: 300,
      expected: {
        top: 0,
        right: 0,
        bottom: -300,
        left: 0
      }
    },
    "quarter cut from top and bottom": {
      top: -25,
      bottom: 75,
      right: 200,
      left: 0,
      vw: 300,
      vh: 50,
      expected: {
        top: -25,
        right: 0,
        bottom: -25,
        left: 0
      }
    },
    "out of view top": {
      top: -200,
      bottom: -5,
      right: 200,
      left: 0,
      vw: 300,
      vh: 200,
      expected: {
        top: -200,
        right: 0,
        bottom: 0,
        left: 0
      }
    },
    "out of view bottom": {
      top: 250,
      bottom: 500,
      right: 200,
      left: 0,
      vw: 300,
      vh: 200,
      expected: {
        top: 0,
        right: 0,
        bottom: -300,
        left: 0
      }
    },
    "half cut from left": {
      top: 0,
      bottom: 200,
      left: -200,
      right: 200,
      vw: 300,
      vh: 300,
      expected: {
        top: 0,
        right: 0,
        bottom: 0,
        left: -200
      }
    },
    "half cut from left and top": {
      top: -100,
      bottom: 100,
      left: -200,
      right: 200,
      vw: 300,
      vh: 300,
      expected: {
        top: -100,
        right: 0,
        bottom: 0,
        left: -200
      }
    },
    "quarter cut from all sides": {
      top: -100,
      left: -100,
      bottom: 300,
      right: 300,
      vw: 200,
      vh: 200,
      expected: {
        top: -100,
        right: -100,
        bottom: -100,
        left: -100
      }
    }
  };
  for (let descr in cases) {
    it(descr, () => {
      const { expected, vh, vw, vCuts, ...rect } = cases[descr];
      expect(getRectCuts(rect, vh, vw, vCuts)).to.deep.equal(expected);
    });
  }
});

describe("get", () => {
  it("returns a property in a nested object 1", () =>
    expect(get(["a"], { a: 1 })).to.equal(1));
  it("returns a property in a nested object 2", () =>
    expect(get(["a", "b"], { a: { b: 1 } })).to.equal(1));
  it("returns a property in a nested object 3", () =>
    expect(get(["a", "b"], { a: { b: 1 } })).to.equal(1));
  it("returns undefined if property does not exist", () =>
    expect(get(["a", "b"], { b: 1 })).to.equal(undefined));
  it("returns undefined if property does not exist", () =>
    expect(get(["a", "b"], undefined)).to.equal(undefined));
  it("returns undefined if property does not exist", () =>
    expect(get(["a", "b"], 1213)).to.equal(undefined));
  const DEFAULT = -5;
  it("returns defaultValue if property does not exist", () =>
    expect(get(["a", "b"], { b: 1 }, DEFAULT)).to.equal(DEFAULT));
  it("returns defaultValue if property does not exist", () =>
    expect(get(["a", "b"], undefined, DEFAULT)).to.equal(DEFAULT));
  it("returns defaultValue if property does not exist", () =>
    expect(get(["a", "b"], 1213, DEFAULT)).to.equal(DEFAULT));
  it("can work with arrays 1", () => expect(get([0, 1], [[1, 2]])).to.equal(2));
  it("can work with arrays 2", () =>
    expect(get([0, "a"], [{ a: 42 }])).to.equal(42));
});
