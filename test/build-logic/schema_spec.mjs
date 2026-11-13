import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// Ajv is not a direct dependency; schema-utils (which is) depends on Ajv 8
const Ajv2020 = createRequire(require.resolve('schema-utils'))('ajv/dist/2020').default;
const { generateSchemas } = require('../../gulp.schema.js');

describe('JSON schema generation', function () {
  this.timeout(60000);

  function fixture(name) {
    return fileURLToPath(new URL(`../fixtures/schema/${name}`, import.meta.url));
  }

  describe('output', () => {
    const BASE_URL = 'https://example.com/schema/';
    let schemas, root;
    before(() => {
      schemas = generateSchemas({ dir: fixture('basic'), baseUrl: BASE_URL });
      root = schemas['root.schema.json'];
    });

    function validator({ withOther = true } = {}) {
      const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
      const other = schemas['nested/other.schema.json'];
      ajv.addSchema(withOther ? other : { $id: other.$id });
      return ajv.compile(root);
    }

    const VALID = {
      other: { value: 'x' },
      tree: { children: [{ children: [] }] },
      serialized: { always: 'x' },
      nullable: null,
      tuple: [1, 'x'],
      open: { any: 'thing' },
    };

    it('is one schema per file under the directory that has a default export, at the same path', () => {
      expect(Object.keys(schemas)).to.have.members(['root.schema.json', 'nested/other.schema.json']);
    });

    it('identifies each schema by its path under the base URL', () => {
      expect(root.$schema).to.eql('https://json-schema.org/draft/2020-12/schema');
      expect(root.$id).to.eql(`${BASE_URL}root.schema.json`);
      expect(schemas['nested/other.schema.json'].$id).to.eql(`${BASE_URL}nested/other.schema.json`);
    });

    it('compiles in strict mode, and validates what the types describe', () => {
      const validate = validator();
      expect(validate(VALID), JSON.stringify(validate.errors)).to.be.true;
      expect(validate({ ...VALID, tree: { children: [{}] } })).to.be.false;
    });

    it('refers to other schemas by relative URL, rather than including them', () => {
      expect(root.properties.other).to.eql({ $ref: 'nested/other.schema.json', type: 'object' });
      expect(Object.keys(root.$defs)).to.not.include('SchemaFixtureOther');
      expect(validator()({ ...VALID, other: { value: 1 } })).to.be.false;
    });

    it('lets consumers replace other schemas with permissive ones, while still requiring their type', () => {
      const validate = validator({ withOther: false });
      expect(validate({ ...VALID, other: { value: 1 } }), JSON.stringify(validate.errors)).to.be.true;
      expect(validate({ ...VALID, other: 'not an object' })).to.be.false;
    });

    it('includes other types as definitions, including recursive ones', () => {
      expect(root.properties.tree).to.eql({ $ref: '#/$defs/SchemaFixtureTree' });
      expect(root.$defs.SchemaFixtureTree.properties.children.items).to.eql({ $ref: '#/$defs/SchemaFixtureTree' });
    });

    it('requires non-optional properties, including nullable ones', () => {
      expect(root.required).to.have.members(['other', 'tree', 'serialized', 'nullable', 'tuple', 'open']);
      expect(root.properties.nullable.type).to.have.members(['string', 'null']);
    });

    it('makes properties that can be undefined optional with Serialized', () => {
      const validate = validator();
      expect(validate({ ...VALID, serialized: { always: 'x', maybe: 'y' } })).to.be.true;
      expect(validate({ ...VALID, serialized: { maybe: 'y' } })).to.be.false;
    });

    it('describes tuples', () => {
      const validate = validator();
      expect(validate({ ...VALID, tuple: ['x', 1] })).to.be.false;
      expect(validate({ ...VALID, tuple: [1, 'x', 2] })).to.be.false;
    });

    it('leaves objects open, unless documented with @additionalProperties false', () => {
      const validate = validator();
      expect(validate({ ...VALID, tree: { children: [], extra: 1 } }), JSON.stringify(validate.errors)).to.be.true;
      expect(validate({ ...VALID, open: { nested: { any: 'thing' } } }), JSON.stringify(validate.errors)).to.be.true;
      expect(validate({ ...VALID, extra: 1 })).to.be.false;
    });
  });

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

  it('fails on type errors in schema types', () => {
    expect(() => generateSchemas({ dir: fixture('typeError') })).to.throw(/Cannot find name 'SchemaFixtureUndeclared'/);
  });

  it('fails when a root type name is not unique', () => {
    expect(() => generateSchemas({ dir: fixture('duplicateName') })).to.throw(/'ORTBRequest' is used for more than one type/);
  });

  it('fails when a schema would describe a bare type parameter', () => {
    expect(() => generateSchemas({ dir: fixture('typeParameter') })).to.throw(/type parameter\(s\) 'V'/);
  });

  it('fails when a schema would describe symbol-keyed members', () => {
    expect(() => generateSchemas({ dir: fixture('symbolKeys') })).to.throw(/symbol-keyed properties.*__@toStringTag/);
  });
});
