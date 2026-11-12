import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// Ajv is not a direct dependency; schema-utils (which is) depends on Ajv 8
const Ajv2020 = createRequire(require.resolve('schema-utils'))('ajv/dist/2020').default;
const { generateSchemas } = require('../../gulp.schema.js');
// what the formatters emit, as asserted by test/spec/modules/genericAnalyticsSkinnyEvents_spec.js
const fixtures = JSON.parse(readFileSync(fileURLToPath(new URL('../fixtures/genericAnalyticsSkinnyEvents.json', import.meta.url)), 'utf8'));

describe('Generic Analytics skinny events JSON Schema', function () {
  this.timeout(60000);
  let schemas;
  before(() => {
    schemas = generateSchemas();
  });

  [true, false].forEach(withOrtb => {
    it(`accepts the formatters' output ${withOrtb ? 'with' : 'without'} the ORTB schemas`, () => {
      const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
      ['ortb2/request.schema.json', 'ortb2/imp.schema.json'].forEach(file => {
        ajv.addSchema(withOrtb ? schemas[file] : { $id: schemas[file].$id });
      });
      const validate = ajv.compile(schemas['genericAnalyticsSkinnyEvents.schema.json']);
      Object.values(fixtures).forEach(event => {
        expect(validate(event), JSON.stringify(validate.errors)).to.be.true;
      });
    });
  });
});
