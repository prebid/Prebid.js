import { expect } from 'chai';
import { Renderer } from 'src/Renderer';

describe('Renderer: A renderer installed on a bid response', () => {
  let testRenderer1;
  let testRenderer2;
  let spyRenderFn;
  let spyEventHandler;

  beforeEach(() => {
    testRenderer1 = Renderer.install({
      url: 'https://httpbin.org/post',
      config: { test: 'config1' },
      id: 1
    });
    testRenderer2 = Renderer.install({
      url: 'https://httpbin.org/post',
      config: { test: 'config2' },
      id: 2
    });

    spyRenderFn = sinon.spy();
    spyEventHandler = sinon.spy();
  });

  it('is an instance of Renderer', () => {
    expect(testRenderer1 instanceof Renderer).to.equal(true);
  });

  it('has expected properties ', () => {
    expect(testRenderer1.url).to.equal('https://httpbin.org/post');
    expect(testRenderer1.config).to.deep.equal({ test: 'config1' });
    expect(testRenderer1.id).to.equal(1);
  });

  it('returns config from getConfig method', () => {
    expect(testRenderer1.getConfig()).to.deep.equal({ test: 'config1' });
    expect(testRenderer2.getConfig()).to.deep.equal({ test: 'config2' });
  });

  it('sets a render function with setRender method', () => {
    testRenderer1.setRender(spyRenderFn);
    expect(typeof testRenderer1.render).to.equal('function');
    testRenderer1.render();
    expect(spyRenderFn.called).to.equal(true);
  });

  it('sets event handlers with setEventHandlers method and handles events with installed handlers', () => {
    testRenderer1.setEventHandlers({
      testEvent: spyEventHandler
    });

    expect(testRenderer1.handlers).to.deep.equal({
      testEvent: spyEventHandler
    });

    testRenderer1.handleVideoEvent({ id: 1, eventName: 'testEvent' });
    expect(spyEventHandler.called).to.equal(true);
  });

  it('pushes commands to queue if renderer is not loaded', () => {
    testRenderer1.push(spyRenderFn);
    expect(testRenderer1.cmd.length).to.equal(1);

    // clear queue for next tests
    testRenderer1.cmd = [];
  });

  it('fires commands immediately if the renderer is loaded', () => {
    const func = sinon.spy();

    testRenderer1.loaded = true;
    testRenderer1.push(func);

    expect(testRenderer1.cmd.length).to.equal(0);

    sinon.assert.calledOnce(func);
  });

  it('processes queue by calling each function in queue', () => {
    testRenderer1.loaded = false;
    const func1 = sinon.spy();
    const func2 = sinon.spy();

    testRenderer1.push(func1);
    testRenderer1.push(func2);
    expect(testRenderer1.cmd.length).to.equal(2);

    testRenderer1.process();

    sinon.assert.calledOnce(func1);
    sinon.assert.calledOnce(func2);
    expect(testRenderer1.cmd.length).to.equal(0);
  });
});
