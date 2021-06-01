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
  getFrameElements,
  getElementCuts,
  getInViewRatio,
  getMayBecomeVisible,
  getInViewPercentage,
  getInViewRatioInsideTopFrame,
  getOffsetTopDocument,
  getOffsetTopDocumentPercentage,
  getOffsetToView,
  getOffsetToViewPercentage,
  area,
  get,
  getViewabilityDescription,
  mergeArrays,
  documentFocus
} from 'modules/viBidAdapter.js';

describe('ratioToPercentageCeil', () => {
  it('1 converts to percentage', () =>
    expect(ratioToPercentageCeil(0.01)).to.equal(1));
  it('2 converts to percentage', () =>
    expect(ratioToPercentageCeil(0.00000000001)).to.equal(1));
  it('3 converts to percentage', () =>
    expect(ratioToPercentageCeil(0.5)).to.equal(50));
  it('4 converts to percentage', () =>
    expect(ratioToPercentageCeil(1)).to.equal(100));
  it('5 converts to percentage', () =>
    expect(ratioToPercentageCeil(0.99)).to.equal(99));
  it('6 converts to percentage', () =>
    expect(ratioToPercentageCeil(0.990000000000001)).to.equal(100));
});

describe('merge', () => {
  it('merges two objects', () => {
    expect(
      merge({ a: 1, b: 2, d: 0 }, { a: 2, b: 2, c: 3 }, (a, b) => a + b)
    ).to.deep.equal({ a: 3, b: 4, c: 3, d: 0 });
  });
});

describe('getDocumentHeight', () => {
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

describe('getOffset', () => {
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
      'returns element offsets from the document edges (including scroll): ' +
        i,
      () => expect(getOffset(element)).to.be.deep.equal(expected)
    )
  );
  it('Throws when there is no window', () =>
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

describe('getWindowParents', () => {
  const win = {};
  win.top = win;
  win.parent = win;
  const win1 = { top: win, parent: win };
  const win2 = { top: win, parent: win1 };
  const win3 = { top: win, parent: win2 };

  it('get parents up to the top', () =>
    expect(getWindowParents(win3)).to.be.deep.equal([win2, win1, win]));
});

describe('getTopmostReachableWindow', () => {
  const win = {};
  win.top = win;
  win.parent = win;
  const win1 = { top: win, parent: win };
  const win2 = { top: win, parent: win1 };
  const win3 = { top: win, parent: win2 };

  it('get parents up to the top', () =>
    expect(getTopmostReachableWindow(win3)).to.be.equal(win));
});

const topWindow = { document, frameElement: 0 };
topWindow.top = topWindow;
topWindow.parent = topWindow;
const topFrameElement = {
  ownerDocument: {
    defaultView: topWindow
  }
};
const frameWindow1 = {
  top: topWindow,
  parent: topWindow,
  frameElement: topFrameElement
};
const frameElement1 = {
  ownerDocument: {
    defaultView: frameWindow1
  }
};
const frameWindow2 = {
  top: topWindow,
  parent: frameWindow1,
  frameElement: frameElement1
};
const frameElement2 = {
  ownerDocument: {
    defaultView: frameWindow2
  }
};
const frameWindow3 = {
  top: topWindow,
  parent: frameWindow2,
  frameElement: frameElement2
};

describe('topDocumentIsReachable', () => {
  it('returns true if it no inside iframe', () =>
    expect(topDocumentIsReachable(topWindow)).to.be.true);
  it('returns true if it can access top document', () =>
    expect(topDocumentIsReachable(frameWindow3)).to.be.true);
});

describe('isInsideIframe', () => {
  it('returns true if window !== window.top', () =>
    expect(isInsideIframe(topWindow)).to.be.false);
  it('returns true if window !== window.top', () =>
    expect(isInsideIframe(frameWindow1)).to.be.true);
});

const safeframeWindow = { $sf: {} };

describe('isInsideSafeframe', () => {
  it('returns true if top window is not reachable and window.$sf is defined', () =>
    expect(isInsideSafeframe(safeframeWindow)).to.be.true);
});

const hostileFrameWindow = {};

describe('getIframeType', () => {
  it('returns undefined when is not inside iframe', () =>
    expect(getIframeType(topWindow)).to.be.undefined);
  it("returns 'safeframe' when inside sf", () =>
    expect(getIframeType(safeframeWindow)).to.be.equal('safeframe'));
  it("returns 'friendly' when inside friendly iframe and can reach top window", () =>
    expect(getIframeType(frameWindow3)).to.be.equal('friendly'));
  it("returns 'nonfriendly' when cannot get top window", () =>
    expect(getIframeType(hostileFrameWindow)).to.be.equal('nonfriendly'));
});

describe('getFrameElements', () => {
  it('it returns a list iframe elements up to the top, topmost goes first', () => {
    expect(getFrameElements(frameWindow3)).to.be.deep.equal([
      topFrameElement,
      frameElement1,
      frameElement2
    ]);
  });
});

describe('area', () => {
  it('calculates area', () => expect(area(10, 10)).to.be.equal(100));
  it('calculates area', () =>
    expect(
      area(10, 10, { top: -2, left: -2, bottom: 0, right: 0 })
    ).to.be.equal(64));
});

describe('getElementCuts', () => {
  it('returns element cuts', () =>
    expect(
      getElementCuts({
        getBoundingClientRect() {
          return {
            top: 0,
            right: 200,
            bottom: 200,
            left: 0
          };
        },
        ownerDocument: {
          defaultView: {
            innerHeight: 1000,
            innerWidth: 1000
          }
        }
      })
    ).to.be.deep.equal({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }));
});

describe('getInViewRatio', () => {
  it('returns inViewRatio', () =>
    expect(
      getInViewRatio({
        ownerDocument: {
          defaultView: {
            innerHeight: 1000,
            innerWidth: 1000
          }
        },
        offsetWidth: 200,
        offsetHeight: 200,
        getBoundingClientRect() {
          return {
            top: 0,
            right: 200,
            bottom: 200,
            left: 0
          };
        }
      })
    ).to.be.deep.equal(1));
});

describe('getMayBecomeVisible', () => {
  it('returns true if not inside iframe of visible inside the iframe', () =>
    expect(
      getMayBecomeVisible({
        ownerDocument: {
          defaultView: {
            innerHeight: 1000,
            innerWidth: 1000
          }
        },
        offsetWidth: 200,
        offsetHeight: 200,
        getBoundingClientRect() {
          return {
            top: 0,
            right: 200,
            bottom: 200,
            left: 0
          };
        }
      })
    ).to.be.true);
});

describe('getInViewPercentage', () => {
  it('returns inViewRatioPercentage', () =>
    expect(
      getInViewPercentage({
        ownerDocument: {
          defaultView: {
            innerHeight: 1000,
            innerWidth: 1000
          }
        },
        offsetWidth: 200,
        offsetHeight: 200,
        getBoundingClientRect() {
          return {
            top: 0,
            right: 200,
            bottom: 200,
            left: 0
          };
        }
      })
    ).to.be.deep.equal(100));
});

describe('getInViewRatioInsideTopFrame', () => {
  it('returns inViewRatio', () =>
    expect(
      getInViewRatioInsideTopFrame({
        ownerDocument: {
          defaultView: {
            innerHeight: 1000,
            innerWidth: 1000
          }
        },
        offsetWidth: 200,
        offsetHeight: 200,
        getBoundingClientRect() {
          return {
            top: 0,
            right: 200,
            bottom: 200,
            left: 0
          };
        }
      })
    ).to.be.deep.equal(1));
});

describe('getOffsetTopDocument', () => {
  it('returns offset relative to the top document', () =>
    expect(
      getOffsetTopDocument({
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
      })
    ).to.be.deep.equal({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }));
});

describe('getOffsetTopDocumentPercentage', () => {
  it('returns offset from the top as a percentage of the page length', () => {
    const topWindow = {
      pageXOffset: 0,
      pageYOffset: 100,
      document: {
        body: {
          clientHeight: 1000
        }
      }
    };
    topWindow.top = topWindow;
    topWindow.parent = topWindow;
    expect(
      getOffsetTopDocumentPercentage({
        ownerDocument: {
          defaultView: topWindow
        },
        getBoundingClientRect: () => ({
          top: 100,
          right: 0,
          bottom: 0,
          left: 0
        })
      })
    ).to.be.equal(20);
  });
  it('throws when cannot get window', () =>
    expect(() =>
      getOffsetTopDocumentPercentage({
        ownerDocument: {}
      })
    ).to.throw());
  it("throw when top document isn't reachable", () => {
    const topWindow = { ...topWindow, document: null };
    expect(() =>
      getOffsetTopDocumentPercentage({
        ownerDocument: {
          defaultView: {
            top: topWindow
          }
        }
      })
    ).to.throw();
  });
});

describe('getOffsetToView', () => {
  expect(
    getOffsetToView({
      ownerDocument: {
        defaultView: {
          scrollY: 0,
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
    })
  ).to.be.equal(0);
});

describe('getOffsetToView', () => {
  expect(
    getOffsetToViewPercentage({
      ownerDocument: {
        defaultView: {
          scrollY: 0,
          pageXOffset: 0,
          pageYOffset: 0,
          document: {
            body: {
              clientHeight: 1000
            }
          }
        }
      },
      getBoundingClientRect: () => ({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      })
    })
  ).to.be.equal(0);
});

describe('getCuts without vCuts', () => {
  const cases = {
    'completely in view 1': {
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
    'completely in view 2': {
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
    'half cut from the top': {
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
    'half cut from the bottom': {
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
    'quarter cut from top and bottom': {
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
    'out of view top': {
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
    'out of view bottom': {
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
    'half cut from left': {
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
    'half cut from left and top': {
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
    'quarter cut from all sides': {
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

describe('getCuts with vCuts', () => {
  const cases = {
    'completely in view 1, half-cut viewport from top': {
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
    'completely in view 2, half-cut viewport from bottom': {
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
    'half cut from the top, 1/3 viewport cut from the bottom': {
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
    'half cut from the bottom': {
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
    'quarter cut from top and bottom': {
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
    'out of view top': {
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
    'out of view bottom': {
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
    'half cut from left': {
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
    'half cut from left and top': {
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
    'quarter cut from all sides': {
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

describe('get', () => {
  it('returns a property in a nested object 1', () =>
    expect(get(['a'], { a: 1 })).to.equal(1));
  it('returns a property in a nested object 2', () =>
    expect(get(['a', 'b'], { a: { b: 1 } })).to.equal(1));
  it('returns a property in a nested object 3', () =>
    expect(get(['a', 'b'], { a: { b: 1 } })).to.equal(1));
  it('returns undefined if property does not exist', () =>
    expect(get(['a', 'b'], { b: 1 })).to.equal(undefined));
  it('returns undefined if property does not exist', () =>
    expect(get(['a', 'b'], undefined)).to.equal(undefined));
  it('returns undefined if property does not exist', () =>
    expect(get(['a', 'b'], 1213)).to.equal(undefined));
  const DEFAULT = -5;
  it('returns defaultValue if property does not exist', () =>
    expect(get(['a', 'b'], { b: 1 }, DEFAULT)).to.equal(DEFAULT));
  it('returns defaultValue if property does not exist', () =>
    expect(get(['a', 'b'], undefined, DEFAULT)).to.equal(DEFAULT));
  it('returns defaultValue if property does not exist', () =>
    expect(get(['a', 'b'], 1213, DEFAULT)).to.equal(DEFAULT));
  it('can work with arrays 1', () => expect(get([0, 1], [[1, 2]])).to.equal(2));
  it('can work with arrays 2', () =>
    expect(get([0, 'a'], [{ a: 42 }])).to.equal(42));
});

describe('getViewabilityDescription', () => {
  it('returns error when there is no element', () => {
    expect(getViewabilityDescription(null)).to.deep.equal({
      error: 'no element'
    });
  });
  it('returns only iframe type for nonfrienly iframe', () => {
    expect(
      getViewabilityDescription({
        ownerDocument: {
          defaultView: {}
        }
      })
    ).to.deep.equal({
      iframeType: 'nonfriendly'
    });
  });
  it('returns only iframe type for safeframe iframe', () => {
    expect(
      getViewabilityDescription({
        ownerDocument: {
          defaultView: {
            $sf: true
          }
        }
      })
    ).to.deep.equal({
      iframeType: 'safeframe'
    });
  });
});

describe('mergeSizes', () => {
  it('merges provides arrays of tuples, leaving only unique', () => {
    expect(
      mergeArrays(x => x.join(','), [[1, 2], [2, 4]], [[1, 2]])
    ).to.deep.equal([[1, 2], [2, 4]]);
  });
  it('merges provides arrays of tuples, leaving only unique', () => {
    expect(
      mergeArrays(
        x => x.join(','),
        [[1, 2], [2, 4]],
        [[1, 2]],
        [[400, 500], [500, 600]]
      )
    ).to.deep.equal([[1, 2], [2, 4], [400, 500], [500, 600]]);
  });
});

describe('documentFocus', () => {
  it('calls hasFocus function if it present, converting boolean to an int 0/1 value, returns undefined otherwise', () => {
    expect(
      documentFocus({
        hasFocus: () => true
      })
    ).to.equal(1);
    expect(
      documentFocus({
        hasFocus: () => false
      })
    ).to.equal(0);
    expect(documentFocus({})).to.be.undefined;
  });
});
