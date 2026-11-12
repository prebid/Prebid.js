import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { compareSets, makeSet, dirSet, publishedSet, previousRelease, formatReport, jsonDiff, checkSchemaTask, reuseSchemasTask } = require('../../gulp.schemaCompat.js');
const { generateSchemas } = require('../../gulp.schema.js');
// Ajv is not a direct dependency; schema-utils (which is) depends on Ajv 8
const Ajv2020 = createRequire(require.resolve('schema-utils'))('ajv/dist/2020').default;
const fixtures = JSON.parse(fs.readFileSync(new URL('../fixtures/genericAnalyticsSkinnyEvents.json', import.meta.url), 'utf8'));

const CDN = 'https://cdn.jsdelivr.net/npm/prebid.js';
const CDN_API = 'https://data.jsdelivr.com/v1/packages/npm/prebid.js';

function schemaSet(base, schemas) {
  return makeSet(Object.fromEntries(Object.entries(schemas).map(([file, schema]) => [file, JSON.stringify({ $id: `${base}${file}`, ...schema })])));
}

function texts(schemas) {
  return Object.fromEntries(Object.entries(schemas).map(([file, schema]) => [file, JSON.stringify(schema, null, 2) + '\n']));
}

/**
 * Stub `fetch` with jsDelivr serving `releases` ({version: {path under dist/schema/: text}}), and resolving any
 * specifier to `resolved`.
 */
function stubCdn(releases, resolved) {
  const urls = Object.fromEntries(Object.entries(releases).flatMap(([version, files]) =>
    Object.entries(files).map(([file, text]) => [`${CDN}@${version}/dist/schema/${file}`, text])));
  return (url) => {
    const respond = (body) => Promise.resolve(body == null ? new Response(null, { status: 404 }) : new Response(body));
    if (url.startsWith(`${CDN_API}/resolved?`)) return respond(JSON.stringify({ version: resolved }));
    const listing = new RegExp(`^${CDN_API}@(.+)\\?structure=flat$`).exec(url);
    if (listing) {
      return respond(releases[listing[1]] == null ? null : JSON.stringify({
        files: [{ name: '/package.json' }, ...Object.keys(releases[listing[1]]).map(file => ({ name: `/dist/schema/${file}` }))]
      }));
    }
    return respond(urls[url]);
  };
}

describe('JSON schema compatibility', function () {
  this.timeout(120000);

  describe('jsonDiff', () => {
    it('reports added, removed and changed members by JSON pointer', () => {
      expect(jsonDiff(
        { a: 1, 'b/c': { d: 'x' }, gone: true },
        { a: 2, 'b/c': { d: 'x', e: [1] } }
      )).to.eql([
        { op: 'change', path: '/a', from: 1, to: 2 },
        { op: 'add', path: '/b~1c/e', to: [1] },
        { op: 'remove', path: '/gone', from: true },
      ]);
    });

    it('compares arrays of the same length by element', () => {
      expect(jsonDiff([{ a: 1 }, 'x'], [{ a: 2 }, 'x'])).to.eql([{ op: 'change', path: '/0/a', from: 1, to: 2 }]);
    });

    it('compares arrays of different lengths as sets', () => {
      expect(jsonDiff(['a', 'b'], ['c', 'a', 'b'])).to.eql([{ op: 'add', path: '/0', to: 'c' }]);
      expect(jsonDiff(['a', 'b', 'c'], ['c', 'a'])).to.eql([{ op: 'remove', path: '/1', from: 'b' }]);
    });
  });

  it('previousRelease is the range below the current version', () => {
    expect(previousRelease('11.50.0-pre')).to.equal('<11.50.0');
    expect(previousRelease('10.5.1')).to.equal('<10.5.1');
  });

  describe('compareSets', () => {
    const SCHEMAS = {
      'root.schema.json': { type: 'object', properties: { value: { $ref: 'nested/value.schema.json' } }, required: ['value'], additionalProperties: false },
      'nested/value.schema.json': { type: 'string' },
    };

    it('finds schemas compatible when only their $id differs', async () => {
      const results = await compareSets(await schemaSet('https://example.com/v1/', SCHEMAS), await schemaSet('https://example.com/v2/', SCHEMAS));
      expect(results).to.eql([
        { file: 'nested/value.schema.json', status: 'compatible' },
        { file: 'root.schema.json', status: 'compatible' },
      ]);
      expect(formatReport(results)).to.equal(null);
    });

    it('propagates changes through references, with a counterexample for each direction that breaks', async () => {
      const results = await compareSets(
        await schemaSet('https://example.com/v1/', SCHEMAS),
        await schemaSet('https://example.com/v2/', { ...SCHEMAS, 'nested/value.schema.json': { type: 'number' } })
      );
      const [value, root] = results;
      expect(value).to.include({ status: 'incompatible' });
      expect(value.diff).to.eql([{ op: 'change', path: '/type', from: 'string', to: 'number' }]);
      expect(typeof JSON.parse(value.counterexamples.rejectedByPrevious)).to.equal('number');
      expect(typeof JSON.parse(value.counterexamples.rejectedByCurrent)).to.equal('string');
      // root.schema.json itself is unchanged, but what it accepts is not
      expect(root).to.include({ status: 'incompatible' });
      expect(root.diff).to.eql([]);
      expect(typeof JSON.parse(root.counterexamples.rejectedByPrevious).value).to.equal('number');
    });

    it('reports only the direction that breaks', async () => {
      const [, root] = await compareSets(
        await schemaSet('https://example.com/v1/', SCHEMAS),
        await schemaSet('https://example.com/v2/', { ...SCHEMAS, 'root.schema.json': { ...SCHEMAS['root.schema.json'], properties: { ...SCHEMAS['root.schema.json'].properties, extra: { type: 'boolean' } } } })
      );
      expect(Object.keys(root.counterexamples)).to.eql(['rejectedByPrevious']);
      expect(JSON.parse(root.counterexamples.rejectedByPrevious)).to.have.property('extra');
      expect(root.diff).to.eql([{ op: 'add', path: '/properties/extra', to: { type: 'boolean' } }]);
    });

    it('reports added and removed schemas', async () => {
      const results = await compareSets(
        await schemaSet('https://example.com/v1/', { 'gone.schema.json': { type: 'string' } }),
        await schemaSet('https://example.com/v2/', { 'new.schema.json': { type: 'string' } })
      );
      expect(results).to.eql([{ file: 'gone.schema.json', status: 'removed' }, { file: 'new.schema.json', status: 'added' }]);
    });

    it('rejects sets with dangling references', async () => {
      let error;
      try {
        await schemaSet('https://example.com/v1/', { 'root.schema.json': SCHEMAS['root.schema.json'] });
      } catch (e) {
        error = e;
      }
      expect(error?.message).to.contain('https://example.com/v1/nested/value.schema.json');
    });
  });

  describe('formatReport', () => {
    it('lists the changed schemas with their diff and counterexamples', () => {
      const report = formatReport([
        { file: 'same.schema.json', status: 'compatible' },
        { file: 'a.schema.json', status: 'incompatible', counterexamples: { rejectedByPrevious: '{"extra":true}' }, diff: [{ op: 'add', path: '/properties/extra', to: { type: 'boolean' } }] },
        { file: 'b.schema.json', status: 'unknown', reason: 'too hard', diff: [] },
      ], '`prebid.js@1.0.0`');
      expect(report).to.contain('2 of 3 schema(s) under `dist/schema/` changed since `prebid.js@1.0.0`.');
      expect(report).to.contain('#### `a.schema.json`: incompatible');
      expect(report).to.contain('+ /properties/extra: {"type":"boolean"}');
      expect(report).to.contain('{"extra":true}');
      expect(report).to.contain('Could not determine compatibility: too hard');
      expect(report).not.to.contain('same.schema.json');
    });
  });

  describe('with the generated schemas', () => {
    let tmp, generated, released, originalFetch;
    const RELEASE = '11.0.0';
    before(() => {
      generated = texts(generateSchemas({ baseUrl: 'https://example.com/schema/' }));
      released = texts(generateSchemas({ baseUrl: `${CDN}@${RELEASE}/dist/schema/` }));
    });
    beforeEach(() => {
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-compat-'));
      originalFetch = globalThis.fetch;
    });
    afterEach(() => {
      globalThis.fetch = originalFetch;
      fs.rmSync(tmp, { recursive: true, force: true });
    });

    function writeDir(dir, files) {
      Object.entries(files).forEach(([file, text]) => {
        fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
        fs.writeFileSync(path.join(dir, file), text);
      });
    }

    function withoutProperty(text, def, property) {
      const schema = JSON.parse(text);
      delete schema.$defs[def].properties[property];
      schema.$defs[def].required = schema.$defs[def].required?.filter(name => name !== property);
      return JSON.stringify(schema, null, 2) + '\n';
    }

    describe('check-schema', () => {
      it('succeeds, with an empty report, against a directory with the same schemas', async () => {
        writeDir(path.join(tmp, 'base'), generated);
        const report = path.join(tmp, 'report.md');
        await checkSchemaTask({ against: path.join(tmp, 'base'), report, version: '11.1.0-pre' })();
        expect(fs.readFileSync(report, 'utf8')).to.equal('');
      });

      it('fails, and writes the report, when a schema changed', async () => {
        const file = 'genericAnalyticsSkinnyEvents.schema.json';
        writeDir(path.join(tmp, 'base'), { ...generated, [file]: withoutProperty(generated[file], 'SkinnyNoBid', 'analyticsLabels') });
        const report = path.join(tmp, 'report.md');
        let error;
        try {
          await checkSchemaTask({ against: path.join(tmp, 'base'), report, version: '11.1.0-pre' })();
        } catch (e) {
          error = e;
        }
        expect(error).to.exist;
        const text = fs.readFileSync(report, 'utf8');
        expect(text).to.contain(`#### \`${file}\`: incompatible`);
        expect(text).to.contain('+ /$defs/SkinnyNoBid/properties/analyticsLabels');
        expect(text).not.to.contain(tmp);
      });

      it('compares with the previous release by default', async () => {
        const requested = [];
        const cdn = stubCdn({ [RELEASE]: released }, RELEASE);
        globalThis.fetch = (url) => { requested.push(url); return cdn(url); };
        await checkSchemaTask({ version: '11.1.0-pre' })();
        expect(requested[0]).to.equal(`${CDN_API}/resolved?specifier=${encodeURIComponent('<11.1.0')}`);
      });
    });

    describe('reuse-schemas', () => {
      const ROOT = 'genericAnalyticsSkinnyEvents.schema.json';
      let outDir, fresh, next;
      before(() => {
        next = texts(generateSchemas({ baseUrl: `${CDN}@11.1.0/dist/schema/` }));
      });
      beforeEach(() => {
        outDir = path.join(tmp, 'dist');
        fresh = next;
        writeDir(outDir, fresh);
      });

      function read() {
        return Object.fromEntries(Object.keys(fresh).map(file => [file, fs.readFileSync(path.join(outDir, file), 'utf8')]));
      }

      it('publishes the previous release\'s schemas when they are compatible', async () => {
        globalThis.fetch = stubCdn({ [RELEASE]: released }, RELEASE);
        await reuseSchemasTask({ outDir, version: '11.1.0' })();
        expect(read()).to.eql(released);
      });

      it('keeps the new version of a schema that changed', async () => {
        globalThis.fetch = stubCdn({ [RELEASE]: { ...released, [ROOT]: withoutProperty(released[ROOT], 'SkinnyNoBid', 'analyticsLabels') } }, RELEASE);
        await reuseSchemasTask({ outDir, version: '11.1.0' })();
        const { [ROOT]: root, ...others } = read();
        expect(others).to.eql(Object.fromEntries(Object.entries(released).filter(([file]) => file !== ROOT)));
        expect(JSON.parse(root).$id).to.equal(JSON.parse(fresh[ROOT]).$id);
        expect(JSON.parse(root).$defs.SkinnyNoBid.properties).to.have.property('analyticsLabels');
      });

      function validates(files) {
        const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
        const schemas = Object.values(files).map(text => JSON.parse(text));
        schemas.forEach(schema => ajv.addSchema(schema));
        const validate = ajv.getSchema(JSON.parse(files[ROOT]).$id);
        Object.values(fixtures).forEach(event => {
          expect(validate(event), JSON.stringify(validate.errors)).to.be.true;
        });
      }

      it('points new schemas to the reused schemas they reference', async () => {
        globalThis.fetch = stubCdn({ [RELEASE]: { ...released, [ROOT]: withoutProperty(released[ROOT], 'SkinnyNoBid', 'analyticsLabels') } }, RELEASE);
        await reuseSchemasTask({ outDir, version: '11.1.0' })();
        const root = read()[ROOT];
        expect(root).to.contain(`"$ref": "${CDN}@${RELEASE}/dist/schema/ortb2/imp.schema.json"`);
        expect(root).not.to.contain('"$ref": "ortb2/');
        validates(read());
      });

      it('reuses schemas from a release that itself reused some', async () => {
        globalThis.fetch = stubCdn({ [RELEASE]: { ...released, [ROOT]: withoutProperty(released[ROOT], 'SkinnyNoBid', 'analyticsLabels') } }, RELEASE);
        await reuseSchemasTask({ outDir, version: '11.1.0' })();
        const published = read();
        fresh = texts(generateSchemas({ baseUrl: `${CDN}@11.2.0/dist/schema/` }));
        writeDir(outDir, fresh);
        globalThis.fetch = stubCdn({ '11.1.0': published }, '11.1.0');
        await reuseSchemasTask({ outDir, version: '11.2.0' })();
        expect(read()).to.eql(published);
        validates(read());
      });

      it('keeps the new schemas when the previous release has none', async () => {
        globalThis.fetch = stubCdn({ [RELEASE]: {} }, RELEASE);
        await reuseSchemasTask({ outDir, version: '11.1.0' })();
        expect(read()).to.eql(fresh);
      });

      it('keeps the new schemas when the previous release cannot be loaded', async () => {
        globalThis.fetch = () => Promise.resolve(new Response(null, { status: 503 }));
        await reuseSchemasTask({ outDir, version: '11.1.0' })();
        expect(read()).to.eql(fresh);
      });
    });

    it('publishedSet fetches schemas that are referenced, but not listed', async () => {
      globalThis.fetch = stubCdn({
        '2.0.0': { 'root.schema.json': JSON.stringify({ $id: `${CDN}@2.0.0/dist/schema/root.schema.json`, $ref: `${CDN}@1.0.0/dist/schema/value.schema.json` }) },
        '1.0.0': { 'value.schema.json': JSON.stringify({ $id: `${CDN}@1.0.0/dist/schema/value.schema.json`, type: 'string' }) },
      }, '2.0.0');
      const set = await publishedSet('2.0.0');
      expect(Object.keys(set.files)).to.eql(['root.schema.json']);
      expect(set.resources[`${CDN}@1.0.0/dist/schema/value.schema.json`]).to.include({ type: 'string' });
    });

    it('dirSet treats a missing directory as empty', async () => {
      expect((await dirSet(path.join(tmp, 'missing'))).files).to.eql({});
    });
  });
});
