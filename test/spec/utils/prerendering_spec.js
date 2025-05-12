import {delayIfPrerendering} from '../../../src/utils/prerendering.js';

describe('delayIfPrerendering', () => {
  let sandbox, enabled, ran;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    enabled = true;
    ran = false;
  });

  afterEach(() => {
    sandbox.restore();
  })

  const delay = delayIfPrerendering(() => enabled, () => {
    ran = true;
  })

  it('should not delay if page is not prerendering', () => {
    delay();
    expect(ran).to.be.true;
  })

  describe('when page is prerendering', () => {
    before(() => {
      if (!('prerendering' in document)) {
        document.prerendering = null;
        after(() => {
          delete document.prerendering;
        })
      }
    })
    beforeEach(() => {
      sandbox.stub(document, 'prerendering').get(() => true);
    });
    function prerenderingDone() {
      document.dispatchEvent(new Event('prerenderingchange'));
    }

    it('should run fn only after prerenderingchange event', async () => {
      delay();
      expect(ran).to.be.false;
      prerenderingDone();
      expect(ran).to.be.true;
    });

    it('should not delay if not enabled', () => {
      enabled = false;
      delay();
      expect(ran).to.be.true;
    })
  })
})
