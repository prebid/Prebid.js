import { describe, it } from 'mocha';
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
const schemaUrl = new URL('../../modules/genericAnalyticsSkinnyEvents.v1.schema.json', import.meta.url);
const fixturesUrl = new URL('../fixtures/genericAnalyticsSkinnyEvents.v1.json', import.meta.url);
const schema = JSON.parse(readFileSync(fileURLToPath(schemaUrl), 'utf8'));
const fixtures = JSON.parse(readFileSync(fileURLToPath(fixturesUrl), 'utf8'));

describe('Generic Analytics skinny events v1 JSON Schema', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);
  const eventTypes = ['noBid', 'bidResponse', 'bidWon', 'bidRequested', 'bidTimeout'];

  it('covers exactly the five built-in formatter event types', () => {
    expect(Object.keys(fixtures).sort()).to.eql([...eventTypes].sort());
    expect(schema.oneOf.map(({ $ref }) => $ref.replace('#/$defs/', '')).sort())
      .to.eql([...eventTypes].sort());
  });

  for (const eventType of eventTypes) {
    it(`validates the serialized ${eventType} fixture`, () => {
      expect(validate(fixtures[eventType]), JSON.stringify(validate.errors)).to.equal(true);
    });
  }

  it('rejects truncated top-level and nested payloads', () => {
    // Every event and nested bid must contain the mandatory fields from the
    // source TypeScript types. This also catches accidentally deleting a
    // required property from the versioned JSON Schema.
    for (const eventType of eventTypes) {
      const payload = fixtures[eventType];
      const definition = schema.$defs[eventType];
      for (const field of definition.required) {
        const truncated = { ...payload };
        delete truncated[field];
        expect(validate(truncated), `${eventType} must require ${field}`).to.equal(false);
      }
    }

    for (const type of ['bidRequest', 'timedOutBidderRequest']) {
      for (const field of schema.$defs[type].required) {
        const truncated = structuredClone(fixtures.bidTimeout);
        if (type === 'bidRequest') {
          delete truncated.bidderRequests[0].bids[0][field];
        } else {
          delete truncated.bidderRequests[0][field];
        }
        expect(validate(truncated), `${type} must require ${field}`).to.equal(false);
      }
    }
  });

  it('permits omitted optional fields', () => {
    const response = { ...fixtures.bidResponse };
    for (const key of ['originalCpm', 'originalCurrency', 'dealId', 'floorData', 'analyticsLabels']) {
      delete response[key];
    }
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

    requested.bidderCode = 123;
    expect(validate(requested), 'numeric bidRequested bidderCode must fail').to.equal(false);
    timeout.bidderRequests[0].bidderCode = 123;
    expect(validate(timeout), 'numeric bidTimeout bidderCode must fail').to.equal(false);
  });

  it('rejects unknown event types and invalid fields', () => {
    const badType = { ...fixtures.noBid, eventType: 'unknownEvent' };
    const badCpm = { ...fixtures.bidResponse, cpm: '1.50' };
    const extraField = { ...fixtures.noBid, extraField: true };
    const badNestedBid = structuredClone(fixtures.bidRequested);
    badNestedBid.bids[0].source = 'somethingElse';
    const badEidSource = structuredClone(fixtures.bidRequested);
    badEidSource.eidsSources = [42];
    for (const value of [badType, badCpm, extraField, badNestedBid, badEidSource]) {
      expect(validate(value), JSON.stringify(value)).to.equal(false);
    }
  });
});
