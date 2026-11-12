import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// schema-utils is a direct development dependency and itself depends on Ajv 8.
// Resolve Ajv relative to schema-utils so this also works with non-hoisted npm
// dependency layouts, without introducing a browser-side dependency.
const require = createRequire(import.meta.url);
const ajvRequire = createRequire(require.resolve('schema-utils'));
const Ajv2020 = ajvRequire('ajv/dist/2020').default;
const { generateSchemas } = require('../../gulp.schema.js');
const fixturesUrl = new URL('../fixtures/genericAnalyticsSkinnyEvents.v1.json', import.meta.url);
const fixtures = JSON.parse(readFileSync(fileURLToPath(fixturesUrl), 'utf8'));

const SKINNY = 'genericAnalyticsSkinnyEvents.v1.schema.json';
const ORTB = ['ortb2/request.schema.json', 'ortb2/imp.schema.json'];
const EVENT_TYPES = ['noBid', 'bidResponse', 'bidWon', 'bidRequested', 'bidTimeout'];

function validator(schemas, { withOrtb = true } = {}) {
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  ORTB.forEach(file => ajv.addSchema(withOrtb ? schemas[file] : { $id: schemas[file].$id }));
  return ajv.compile(schemas[SKINNY]);
}

describe('Generic Analytics skinny events v1 JSON Schema', function () {
  this.timeout(60000);
  let schemas, validate;
  before(() => {
    schemas = generateSchemas();
    validate = validator(schemas);
  });

  function defFor(eventType) {
    return Object.values(schemas[SKINNY].$defs).find(def => def.properties?.eventType?.const === eventType);
  }

  it('covers exactly the five built-in formatter event types', () => {
    expect(Object.keys(fixtures).sort()).to.eql([...EVENT_TYPES].sort());
    expect(schemas[SKINNY].anyOf.map(({ $ref }) => schemas[SKINNY].$defs[$ref.replace('#/$defs/', '')].properties.eventType.const).sort())
      .to.eql([...EVENT_TYPES].sort());
  });

  EVENT_TYPES.forEach(eventType => {
    it(`validates the serialized ${eventType} fixture`, () => {
      expect(validate(fixtures[eventType]), JSON.stringify(validate.errors)).to.equal(true);
    });

    it(`requires the non-optional ${eventType} fields`, () => {
      const { required } = defFor(eventType);
      expect(required).to.include('eventType');
      required.forEach(field => {
        const truncated = { ...fixtures[eventType] };
        delete truncated[field];
        expect(validate(truncated), `${eventType} must require ${field}`).to.equal(false);
      });
    });
  });

  it('requires the non-optional fields of nested bid requests', () => {
    const { required } = schemas[SKINNY].$defs.SkinnyBidRequest;
    expect(required).to.include('bidId');
    required.forEach(field => {
      const truncated = structuredClone(fixtures.bidTimeout);
      delete truncated.bidderRequests[0].bids[0][field];
      expect(validate(truncated), `bid request must require ${field}`).to.equal(false);
    });
  });

  it('permits omitting fields that can be undefined', () => {
    const response = { ...fixtures.bidResponse };
    // size is unset on bidResponse for bids without targeting, e.g. zero-CPM non-deal bids.
    ['originalCpm', 'originalCurrency', 'dealId', 'size', 'floorData', 'analyticsLabels', 'adserverTargeting'].forEach(key => {
      delete response[key];
    });
    expect(validate(response), JSON.stringify(validate.errors)).to.equal(true);
    const won = { ...fixtures.bidWon };
    delete won.status;
    expect(validate(won), JSON.stringify(validate.errors)).to.equal(true);
  });

  it('accepts null bidder codes for stored-impression PBS requests', () => {
    const requested = structuredClone(fixtures.bidRequested);
    requested.bidderCode = null;
    requested.bids[0].bidder = null;
    expect(validate(requested), JSON.stringify(validate.errors)).to.equal(true);
    const timeout = structuredClone(fixtures.bidTimeout);
    timeout.bidderRequests[0].bidderCode = null;
    timeout.bidderRequests[0].bids[0].bidder = null;
    expect(validate(timeout), JSON.stringify(validate.errors)).to.equal(true);
  });

  Object.entries({
    'unknown event type': { ...fixtures.noBid, eventType: 'unknownEvent' },
    'string cpm': { ...fixtures.bidResponse, cpm: '1.50' },
    'unknown top level field': { ...fixtures.noBid, extraField: true },
    'unknown mediaType': { ...fixtures.bidResponse, mediaType: 'other' },
    'unknown bid status': { ...fixtures.bidWon, status: 'other' },
    'numeric bidderCode': { ...fixtures.bidRequested, bidderCode: 123 },
    'non-string EID source': { ...fixtures.bidRequested, eidsSources: [42] },
    'invalid floorData': { ...fixtures.bidResponse, floorData: { ...fixtures.bidResponse.floorData, floorValue: '1' } },
    'invalid nested source': (() => {
      const payload = structuredClone(fixtures.bidRequested);
      payload.bids[0].source = 'other';
      return payload;
    })(),
    'invalid size': (() => {
      const payload = structuredClone(fixtures.bidRequested);
      payload.bids[0].sizes = [[300, 250, 1]];
      return payload;
    })(),
  }).forEach(([t, payload]) => {
    it(`rejects ${t}`, () => {
      expect(validate(payload)).to.equal(false);
    });
  });

  describe('OpenRTB', () => {
    function withOrtb(ortb2, ortb2Imp) {
      const payload = structuredClone(fixtures.bidRequested);
      payload.ortb2 = ortb2;
      if (ortb2Imp !== undefined) payload.bids[0].ortb2Imp = ortb2Imp;
      return payload;
    }

    it('accepts undeclared fields at any level', () => {
      const payload = withOrtb(
        { custom: 1, site: { custom: { a: 1 }, ext: { custom: 1 }, publisher: { custom: 1 } }, user: { ext: { eids: [] } } },
        { custom: 1, banner: { custom: 1, format: [{ w: 300, h: 250, custom: 1 }] } }
      );
      expect(validate(payload), JSON.stringify(validate.errors)).to.equal(true);
    });

    it('rejects invalid values for declared fields', () => {
      expect(validate(withOrtb({ site: { domain: 42 } }))).to.equal(false);
      expect(validate(withOrtb({}, { banner: { w: '300' } }))).to.equal(false);
    });

    it('are separate schemas that consumers can choose not to use', () => {
      const permissive = validator(schemas, { withOrtb: false });
      expect(permissive(withOrtb({ site: { domain: 42 } }, { banner: { w: '300' } })), JSON.stringify(permissive.errors)).to.equal(true);
      expect(permissive(withOrtb('not an object'))).to.equal(false);
    });
  });
});
