import { expect } from 'chai';
import { validateFpd } from 'libraries/fpdUtils/validateFpd.js';

describe('validateFpd library', () => {
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
});
