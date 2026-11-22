import { describe, it } from 'mocha';
import { expect } from 'chai';
import { metadataFor } from '../../metadata/compileMetadata.mjs';

describe('metadataFor', () => {
  const DISCLOSURE_URLS = {
    1: 'https://one.example/disclosure.json',
    2: 'https://two.example/disclosure.json',
    3: 'https://one.example/disclosure.json',
  };
  const PURPOSES = {
    purposes: [1, 2, 4, 7],
    legIntPurposes: [],
    flexiblePurposes: [],
    specialFeatures: []
  };

  let fetched, purposesFor;
  const deps = {
    getDisclosureUrl: (gvlid) => Promise.resolve(DISCLOSURE_URLS[gvlid]),
    fetchDisclosure: ({ disclosureURL }) => {
      fetched.push(disclosureURL);
      return Promise.resolve([{ identifier: disclosureURL, type: 'cookie' }]);
    },
    previousDisclosure: () => Promise.resolve(null),
    getPurposes: (gvlid) => {
      purposesFor.push(gvlid);
      return Promise.resolve(PURPOSES);
    }
  };

  beforeEach(() => {
    fetched = [];
    purposesFor = [];
  });

  function component(gvlid, disclosureURL = null) {
    return { componentType: 'bidder', componentName: 'mock', aliasOf: null, gvlid, disclosureURL };
  }

  it('keeps a single disclosure URL for a single GVL ID', async () => {
    const { components, disclosures, purposes } = await metadataFor('mockBidAdapter', [component(1)], true, deps);
    expect(components[0].disclosureURL).to.equal(DISCLOSURE_URLS[1]);
    expect(Object.keys(disclosures)).to.eql([DISCLOSURE_URLS[1]]);
    expect(purposes).to.eql({ 1: PURPOSES });
  });

  it('collects the disclosures and purposes of every GVL ID', async () => {
    const { components, disclosures, purposes } = await metadataFor('mockBidAdapter', [component([1, 2])], true, deps);
    expect(components[0].disclosureURL).to.eql([DISCLOSURE_URLS[1], DISCLOSURE_URLS[2]]);
    expect(Object.keys(disclosures)).to.have.members([DISCLOSURE_URLS[1], DISCLOSURE_URLS[2]]);
    expect(disclosures[DISCLOSURE_URLS[2]].disclosures).to.eql([{ identifier: DISCLOSURE_URLS[2], type: 'cookie' }]);
    expect(purposes).to.eql({ 1: PURPOSES, 2: PURPOSES });
  });

  it('does not repeat disclosure URLs shared by more than one GVL ID', async () => {
    const { components } = await metadataFor('mockBidAdapter', [component([1, 3])], true, deps);
    expect(components[0].disclosureURL).to.equal(DISCLOSURE_URLS[1]);
    expect(fetched).to.eql([DISCLOSURE_URLS[1]]);
    expect(purposesFor).to.eql([1, 3]);
  });

  it('leaves out disclosure URLs that cannot be found', async () => {
    const { components, disclosures } = await metadataFor('mockBidAdapter', [component([2, 99])], true, deps);
    expect(components[0].disclosureURL).to.equal(DISCLOSURE_URLS[2]);
    expect(Object.keys(disclosures)).to.eql([DISCLOSURE_URLS[2]]);
  });

  it('prefers an explicit disclosure URL over those of its GVL IDs', async () => {
    const { components, disclosures } = await metadataFor('mockBidAdapter', [component([1, 2], 'https://explicit.example/disclosure.json')], true, deps);
    expect(components[0].disclosureURL).to.equal('https://explicit.example/disclosure.json');
    expect(Object.keys(disclosures)).to.eql(['https://explicit.example/disclosure.json']);
  });

  it('does not set a disclosure URL when none of the GVL IDs has one', async () => {
    const { components } = await metadataFor('mockBidAdapter', [component([98, 99])], true, deps);
    expect(components[0].disclosureURL).to.not.exist;
  });
});
