import { render } from 'creative/renderers/safe/renderer.js';

describe('Creative renderer - safe', () => {
  const sandbox = sinon.createSandbox();
  let doc, mkFrame, win;
  let appendChildFrame;
  /** scriptStub + pbSafeRenderInFrame filled when mkFrame runs */
  let pipelineRefs;

  /**
   * @param {object} [options]
   * @param {boolean} [options.simulateMissingPbSafeRenderInFrame] — script "loads" but does not set pbSafeRenderInFrame
   */
  function stubFrameWithScriptPipeline(options = {}) {
    const simulateMissingPbSafeRenderInFrame = !!options.simulateMissingPbSafeRenderInFrame;

    const refs = {
      scriptStub: null,
      pbSafeRenderInFrame: null
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
        if (!simulateMissingPbSafeRenderInFrame) {
          const fn = sandbox.stub();
          cw.pbSafeRenderInFrame = fn;
          refs.pbSafeRenderInFrame = fn;
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
      safeRendererUrl: 'https://example.com/r.js',
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
    return runRenderer({ safeRendererUrl: 'https://example.com/r.js' }).then(() => {
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
    return runRenderer({ safeRendererUrl: 'https://example.com/r.js' }).then(() => {
      expect(doc.body.style.height).to.eql('100%');
      expect(doc.body.parentElement.style.height).to.eql('100%');
    });
  });

  it('injects script with src = safeRendererUrl and calls pbSafeRenderInFrame with data', () => {
    const data = {
      safeRendererUrl: 'https://cdn.example.com/safe.js',
      adId: 'a1',
      width: 300,
      height: 250
    };
    return runRenderer(data).then(() => {
      expect(pipelineRefs.scriptStub.src).to.eql(data.safeRendererUrl);
      sinon.assert.calledWith(pipelineRefs.pbSafeRenderInFrame, data);
    });
  });

  it('rejects when pbSafeRenderInFrame is not a function after script load', () => {
    stubFrameWithScriptPipeline({ simulateMissingPbSafeRenderInFrame: true });
    return runRenderer({ safeRendererUrl: 'https://example.com/r.js' }).then(
      () => {
        throw new Error('expected reject');
      },
      (err) => {
        expect(err.message).to.include('pbSafeRenderInFrame');
      }
    );
  });

  afterEach(() => {
    sandbox.restore();
  });
});
