import { expect } from 'chai';
import * as utils from 'src/utils.js';
import { fpdValidator } from 'libraries/fpdUtils/validateFpd.js';

describe('validateFpd library', () => {
  const { validateFpd } = fpdValidator(utils);

  it('should filter invalid ortb2 fields', () => {
    const validated = validateFpd({
      imp: { id: '1' },
      device: { w: 1920, h: 1080 },
      user: {
        yob: 'not-a-number',
        data: [{
          name: 'bar',
          ext: 'string',
          segment: [{ id: 'foo' }],
        }],
      },
    });

    expect(validated).to.deep.equal({
      device: { w: 1920, h: 1080 },
      user: {
        data: [{
          name: 'bar',
          segment: [{ id: 'foo' }],
        }],
      },
    });
  });

  it('should preserve valid ortb2', () => {
    const input = {
      device: { w: 1920, h: 1080 },
      site: { domain: 'example.com' },
    };

    expect(validateFpd(input)).to.deep.equal(input);
  });

  it('should filter optout-applicable user fields when optout is true', () => {
    const validated = validateFpd({
      user: {
        yob: 1990,
        gender: 'M',
        keywords: 'sports',
      },
    }, '', '', true);

    expect(validated).to.deep.equal({
      user: {
        keywords: 'sports',
      },
    });
  });

  it('should log Filtered warnings through the injected logWarn', () => {
    const logWarn = sinon.spy();
    const { validateFpd } = fpdValidator({ ...utils, logWarn });

    validateFpd({ imp: { id: '1' } });

    expect(logWarn.firstCall.args[0]).to.match(/^Filtered /);
  });

  it('should log Invalid (not Filtered) warnings when filtered option is false', () => {
    const logWarn = sinon.spy();
    const { validateFpd } = fpdValidator({ ...utils, logWarn }, { filtered: false });

    validateFpd({ imp: { id: '1' } });

    expect(logWarn.firstCall.args[0]).to.match(/^Invalid /);
    expect(logWarn.firstCall.args[0]).to.not.match(/^Filtered /);
  });

  it('should return the input unchanged and not mutate it when filtered is false', () => {
    const logWarn = sinon.spy();
    const { validateFpd } = fpdValidator({ ...utils, logWarn }, { filtered: false });
    const input = {
      imp: { id: '1' },
      device: { w: 1920, h: 1080 },
      user: { yob: 'not-a-number' },
    };
    const snapshot = utils.deepClone(input);

    const result = validateFpd(input);

    // validation ran (invalid fields present) but the input is untouched and returned as-is
    expect(logWarn.called).to.be.true;
    expect(result).to.equal(input);
    expect(input).to.deep.equal(snapshot);
  });

  it('should skip validation entirely when filtered is false and no deepClone is provided', () => {
    const logWarn = sinon.spy();
    const { validateFpd } = fpdValidator({ ...utils, logWarn, deepClone: undefined }, { filtered: false });
    const input = { imp: { id: '1' } };

    const result = validateFpd(input);

    expect(result).to.equal(input);
    expect(logWarn.called).to.be.false;
  });
});
