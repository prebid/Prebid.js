import { render } from 'creative/renderers/safe/renderer.js';

describe('Creative renderer - safe', () => {
  const sandbox = sinon.createSandbox();
  let doc, mkFrame, win;
  let appendChildFrame;
  /** scriptStub + pbRenderInFrame filled when mkFrame runs */
  let pipelineRefs;

  function sr(url) {
    return { safeRenderer: { url } };
  }

  /**
   * @param {object} [options]
   * @param {boolean} [options.simulateMissingPbRenderInFrame] — script "loads" but does not set pbRenderInFrame
   * @param {boolean} [options.simulateScriptLoadFailure] — script element fires `onerror` instead of `onload`
   */
  function stubFrameWithScriptPipeline(options = {}) {
    const simulateMissingPbRenderInFrame = !!options.simulateMissingPbRenderInFrame;
    const simulateScriptLoadFailure = !!options.simulateScriptLoadFailure;

    const refs = {
      scriptStub: null,
      pbRenderInFrame: null
    };

    mkFrame = sandbox.stub().callsFake((d, attrs) => {
      const scriptStub = { tagName: 'SCRIPT' };
      refs.scriptStub = scriptStub;

      const createElement = sandbox.stub().callsFake((tag) => {
        if (tag === 'script') {
          return scriptStub;
        }
        return {};
      });

      const cw = {};

      const appendScript = sandbox.stub().callsFake((script) => {
        if (simulateScriptLoadFailure) {
          if (typeof script.onerror === 'function') {
            script.onerror();
          }
          return;
        }
        if (!simulateMissingPbRenderInFrame) {
          const fn = sandbox.stub();
          cw.pbRenderInFrame = fn;
          refs.pbRenderInFrame = fn;
        }
        if (typeof script.onload === 'function') {
          script.onload();
        }
      });

      cw.document = {
        createElement,
        head: { appendChild: appendScript }
      };

      return {
        doc: d,
        ...attrs,
        contentWindow: cw,
        onload: null,
        onerror: null
      };
    });

    return refs;
  }

  function runRenderer(data) {
    return render(data, { mkFrame }, win);
  }

  beforeEach(() => {
    appendChildFrame = sandbox.stub().callsFake((frame) => {
      if (typeof frame.onload === 'function') {
        frame.onload();
      }
    });
    doc = {
      body: {
        appendChild: appendChildFrame
      }
    };
    win = {
      document: doc
    };
    pipelineRefs = stubFrameWithScriptPipeline();
  });

  it('calls mkFrame with width and height from data', () => {
    const data = {
      ...sr('https://example.com/r.js'),
      width: 123,
      height: 321
    };
    return runRenderer(data).then(() => {
      sinon.assert.calledWith(mkFrame, doc, {
        width: data.width,
        height: data.height
      });
    });
  });

  it('defaults width and height to 100%', () => {
    return runRenderer(sr('https://example.com/r.js')).then(() => {
      sinon.assert.calledWith(mkFrame, doc, {
        width: '100%',
        height: '100%'
      });
    });
  });

  it('sets html and body style height: 100% if no height is provided', () => {
    Object.assign(doc.body, {
      style: {},
      parentElement: {
        style: {}
      }
    });
    return runRenderer(sr('https://example.com/r.js')).then(() => {
      expect(doc.body.style.height).to.eql('100%');
      expect(doc.body.parentElement.style.height).to.eql('100%');
    });
  });

  it('injects script with src = safeRenderer.url and calls pbRenderInFrame with data', () => {
    const data = {
      safeRenderer: { url: 'https://cdn.example.com/safe.js' },
      adId: 'a1',
      width: 300,
      height: 250
    };
    return runRenderer(data).then(() => {
      expect(pipelineRefs.scriptStub.src).to.eql(data.safeRenderer.url);
      sinon.assert.calledOnce(pipelineRefs.pbRenderInFrame);
      expect(pipelineRefs.pbRenderInFrame.firstCall.args[0]).to.eql({
        config: undefined,
        adId: data.adId,
        width: data.width,
        height: data.height
      });
    });
  });

  it('rejects when safeRenderer.url script fails to load', () => {
    stubFrameWithScriptPipeline({ simulateScriptLoadFailure: true });
    return runRenderer(sr('https://example.com/r.js')).then(
      () => {
        throw new Error('expected reject');
      },
      (err) => {
        expect(err.message).to.include('failed to load script');
      }
    );
  });

  it('rejects when iframe fails to load', () => {
    appendChildFrame.resetBehavior();
    appendChildFrame.callsFake((frame) => {
      if (typeof frame.onerror === 'function') {
        frame.onerror();
      }
    });

    return runRenderer(sr('https://example.com/r.js')).then(
      () => {
        throw new Error('expected reject');
      },
      (err) => {
        expect(err.message).to.include('iframe failed to load');
      }
    );
  });

  it('rejects when pbRenderInFrame is not a function after script load', () => {
    stubFrameWithScriptPipeline({ simulateMissingPbRenderInFrame: true });
    return runRenderer(sr('https://example.com/r.js')).then(
      () => {
        throw new Error('expected reject');
      },
      (err) => {
        expect(err.message).to.include('pbRenderInFrame');
      }
    );
  });

  afterEach(() => {
    sandbox.restore();
  });
});
