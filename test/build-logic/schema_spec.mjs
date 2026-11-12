import { describe, it } from 'mocha';
import { expect } from 'chai';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { generateSchemas } = require('../../gulp.schema.js');

describe('JSON schema generation', function () {
  this.timeout(60000);

  it('fails when a schema would describe a bare type parameter', () => {
    const dir = fileURLToPath(new URL('../fixtures/schema/typeParameter', import.meta.url));
    expect(() => generateSchemas({ dir })).to.throw(/type parameter\(s\) 'V'/);
  });
});
