import { render } from 'creative/renderers/frame/renderer.js';

describe('Creative renderer - frame', () => {
  let sandbox;
  let doc, mkFrame, win;
  let appendChildFrame;
  /** scriptStub + pbRenderInFrame filled when mkFrame runs */
  let pipelineRefs;

  /**
   * @param {object} [options]
   * @param {boolean} [options.simulateMissingPbRenderInFrame] — script "loads" but does not set pbRenderInFrame
   */
  function stubFrameWithScriptPipeline(options = {}) {
    const simulateMissingPbRenderInFrame = !!options.simulateMissingPbRenderInFrame;

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
    sandbox = sinon.createSandbox();
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
      frameRendererUrl: 'https://example.com/r.js',
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
    return runRenderer({ frameRendererUrl: 'https://example.com/r.js' }).then(() => {
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
    return runRenderer({ frameRendererUrl: 'https://example.com/r.js' }).then(() => {
      expect(doc.body.style.height).to.eql('100%');
      expect(doc.body.parentElement.style.height).to.eql('100%');
    });
  });

  it('injects script with src = frameRendererUrl and calls pbRenderInFrame with data', () => {
    const data = {
      frameRendererUrl: 'https://cdn.example.com/frame.js',
      adId: 'a1',
      width: 300,
      height: 250
    };
    return runRenderer(data).then(() => {
      expect(pipelineRefs.scriptStub.src).to.eql(data.frameRendererUrl);
      sinon.assert.calledWith(pipelineRefs.pbRenderInFrame, data);
    });
  });

  it('rejects when pbRenderInFrame is not a function after script load', () => {
    stubFrameWithScriptPipeline({ simulateMissingPbRenderInFrame: true });
    return runRenderer({ frameRendererUrl: 'https://example.com/r.js' }).then(
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
