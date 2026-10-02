import { defer, urgentDelay } from '../../../../src/utils/promise.js';

describe('defer', () => {
  Object.entries({
    'resolve': (p) => p,
    'reject': (p) => p.then(() => 'wrong', (v) => v)
  }).forEach(([method, transform]) => {
    describe(method, () => {
      it(`should ${method} the promise`, () => {
        const ctl = defer();
        ctl[method]('result');
        return transform(ctl.promise).then((res) => expect(res).to.equal('result'));
      });

      it('should ignore calls after the first', () => {
        const ctl = defer();
        ctl[method]('result');
        ctl[method]('other');
        return transform(ctl.promise).then((res) => expect(res).to.equal('result'));
      });
    });
  });
});

describe('urgentDelay', () => {
  let sandbox, scheduler;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    scheduler = window.scheduler;
  });

  afterEach(() => {
    sandbox.restore();
    if (scheduler == null) {
      delete window.scheduler;
    } else {
      window.scheduler = scheduler;
    }
  });

  it('schedules through postTask, at user-blocking priority, when it is available', async () => {
    const postTask = sinon.stub().resolves();
    window.scheduler = { postTask };
    await urgentDelay(20);
    sinon.assert.calledOnce(postTask);
    expect(postTask.firstCall.args[1]).to.eql({ priority: 'user-blocking', delay: 20 });
  });

  it('resolves through a timer when postTask is unavailable', async () => {
    delete window.scheduler;
    await urgentDelay(1);
  });

  it('falls back to a timer when postTask throws', async () => {
    const postTask = sinon.stub().throws(new Error());
    window.scheduler = { postTask };
    await urgentDelay(1);
    sinon.assert.called(postTask);
  });

  it('resolves, rather than rejecting, when the scheduled task is aborted', async () => {
    window.scheduler = { postTask: sinon.stub().rejects(new Error()) };
    await urgentDelay(1);
  });
});
