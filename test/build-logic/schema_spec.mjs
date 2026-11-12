import { describe, it } from 'mocha';
import { expect } from 'chai';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { generateSchemas } = require('../../gulp.schema.js');

describe('JSON schema generation', function () {
  this.timeout(60000);

  function fixture(name) {
    return fileURLToPath(new URL(`../fixtures/schema/${name}`, import.meta.url));
  }

  it('includes module augmentations from files the schema types do not import', () => {
    const schema = generateSchemas({ dir: fixture('augmentation') })['root.schema.json'];
    expect(schema.$defs.SchemaFixtureBase.required).to.have.members(['declared', 'augmented']);
  });

  it('uses JSDoc tags as schema keywords only in schema types', () => {
    const schema = generateSchemas({ dir: fixture('jsdoc') })['root.schema.json'];
    expect(schema.properties.local).to.eql({ type: 'string', minLength: 1 });
    expect(schema.$defs.SchemaFixtureDocumented.properties).to.eql({
      constrained: { type: 'string', description: 'Has a description.' },
      retyped: { type: 'number' },
      ignored: { type: 'boolean' },
    });
  });

  it('fails when a root type name is not unique', () => {
    expect(() => generateSchemas({ dir: fixture('duplicateName') })).to.throw(/'ORTBRequest' is used for more than one type/);
  });

  it('fails when a schema would describe a bare type parameter', () => {
    expect(() => generateSchemas({ dir: fixture('typeParameter') })).to.throw(/type parameter\(s\) 'V'/);
  });
});
