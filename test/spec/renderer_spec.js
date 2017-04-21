import { expect } from 'chai';
import { Renderer } from 'src/Renderer';

describe('Renderer: A renderer installed on a bid response', () => {
  const testRenderer1 = Renderer.install({
    url: 'https://httpbin.org',
    config: { test: 'config1' },
    id: 1
  });
  const testRenderer2 = Renderer.install({
    url: 'https://httpbin.org',
    config: { test: 'config2' },
    id: 2
  });

  const spyRenderFn = sinon.spy();
  const spyEventHandler = sinon.spy();

  it('is an instance of Renderer', () => {
    expect(testRenderer1 instanceof Renderer).to.equal(true);
  });

  it('has expected properties ', () => {
    expect(testRenderer1.url).to.equal('https://httpbin.org');
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

  it('sets event handlers with setEventHandlers method', () => {
    testRenderer1.setEventHandlers({
      testEvent: spyEventHandler
    });

    expect(testRenderer1.handlers).to.deep.equal({
      testEvent: spyEventHandler
    });
  });

  it('handles events with installed handlers', () => {
    testRenderer1.handleVideoEvent({ id: 1, eventName: 'testEvent' });
    expect(spyEventHandler.called).to.equal(true);
  });
});
