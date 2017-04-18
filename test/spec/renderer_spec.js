import { expect } from 'chai';
import { Renderer } from 'src/renderer';

describe('A renderer installed on a bid response', () => {
  const testRenderer = Renderer.install({
    url: 'test/url',
    config: { test: 'config' },
    id: 1
  });

  it('will be of type Renderer', () => {
    expect(typeof testRenderer).to.equal(Renderer);
  });

  it('will have expected properties ', () => {
    expect(testRenderer.url).to.equal('test/url');
    expect(testRenderer.config).to.deep.equal({ test: 'config' });
    expect(testRenderer.id).to.equal(1);
  });
});
