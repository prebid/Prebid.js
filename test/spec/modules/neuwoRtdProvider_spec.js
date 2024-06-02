import { server } from 'test/mocks/xhr.js';
import * as neuwo from 'modules/neuwoRtdProvider';

const PUBLIC_TOKEN = 'public_key_0000';
const config = () => ({
  params: {
    publicToken: PUBLIC_TOKEN,
    apiUrl: 'https://testing-requirement.neuwo.api'
  }
})

const apiReturns = () => ({
  somethingExtra: { object: true },
  marketing_categories: {
    iab_tier_1: [
      { ID: 'IAB21', label: 'Real Estate', relevance: '0.45699' }
    ]
  }
})

const TAX_ID = '441'

/**
 * Object generator, like above, written using alternative techniques
 * @returns object with predefined (expected) bidsConfig fields
 */
function bidsConfiglike() {
  return Object.assign({}, {
    ortb2Fragments: { global: {} }
  })
}

describe('neuwoRtdProvider', function () {
  describe('neuwoRtdModule', function () {
    it('initializes', function () {
      expect(neuwo.neuwoRtdModule.init(config())).to.be.true;
    })
    it('init needs that public token', function () {
      expect(neuwo.neuwoRtdModule.init()).to.be.false;
    })

    describe('segment picking', function () {
      it('handles bad inputs', function () {
        expect(neuwo.pickSegments()).to.be.an('array').that.is.empty;
        expect(neuwo.pickSegments('technically also an array')).to.be.an('array').that.is.empty;
        expect(neuwo.pickSegments({ bad_object: 'bad' })).to.be.an('array').that.is.empty;
      })
      it('handles malformations', function () {
        let result = neuwo.pickSegments([{something_wrong: true}, null, { ID: 'IAB19-20' }, { id: 'IAB3-1', ID: 'IAB9-20' }])
        expect(result[0].id).to.equal('631')
        expect(result[1].id).to.equal('58')
        expect(result.length).to.equal(2)
      })
    })

    describe('topic injection', function () {
      it('mutates bidsConfig', function () {
        let topics = apiReturns()
        let bidsConfig = bidsConfiglike()
        neuwo.injectTopics(topics, bidsConfig, () => { })
        expect(bidsConfig.ortb2Fragments.global.site.content.data[0].name, 'name of first content data object').to.equal(neuwo.DATA_PROVIDER)
        expect(bidsConfig.ortb2Fragments.global.site.content.data[0].segment[0].id, 'id of first segment in content.data').to.equal(TAX_ID)
        expect(bidsConfig.ortb2Fragments.global.site.cattax, 'category taxonomy code for pagecat').to.equal(6) // CATTAX_IAB
        expect(bidsConfig.ortb2Fragments.global.site.pagecat[0], 'category taxonomy code for pagecat').to.equal(TAX_ID)
      })

      it('handles malformed responses', function () {
        let topics = { message: 'Forbidden' }
        let bidsConfig = bidsConfiglike()
        neuwo.injectTopics(topics, bidsConfig, () => { })
        expect(bidsConfig.ortb2Fragments.global.site.content.data[0].name, 'name of first content data object').to.equal(neuwo.DATA_PROVIDER)
        expect(bidsConfig.ortb2Fragments.global.site.content.data[0].segment, 'length of segment(s) in content.data').to.be.an('array').that.is.empty;

        topics = '404 wouldn\'t really even show up for injection'
        let bdsConfig = bidsConfiglike()
        neuwo.injectTopics(topics, bdsConfig, () => { })
        expect(bdsConfig.ortb2Fragments.global.site.content.data[0].name, 'name of first content data object').to.equal(neuwo.DATA_PROVIDER)
        expect(bdsConfig.ortb2Fragments.global.site.content.data[0].segment, 'length of segment(s) in content.data').to.be.an('array').that.is.empty;

        topics = undefined
        let bdsConfigE = bidsConfiglike()
        neuwo.injectTopics(topics, bdsConfigE, () => { })
        expect(bdsConfigE.ortb2Fragments.global.site.content.data[0].name, 'name of first content data object').to.equal(neuwo.DATA_PROVIDER)
        expect(bdsConfigE.ortb2Fragments.global.site.content.data[0].segment, 'length of segment(s) in content.data').to.be.an('array').that.is.empty;
      })
    })

    describe('fragment addition', function () {
      it('mutates input objects', function () {
        let alphabet = { a: { b: { c: {} } } }
        neuwo.addFragment(alphabet.a.b.c, 'd.e.f', { g: 'h' })
        expect(alphabet.a.b.c.d.e.f.g).to.equal('h')
      })
    })

    describe('getBidRequestData', function () {
      it('forms requests properly and mutates input bidsConfig', function () {
        let bids = bidsConfiglike()
        let conf = config()
        // control xhr api request target for testing
        conf.params.argUrl = 'https://publisher.works/article.php?get=horrible_url_for_testing&id=5'

        neuwo.getBidRequestData(bids, () => { }, conf, 'any consent data works, clearly')

        let request = server.requests[0];
        expect(request.url).to.be.a('string').that.includes(conf.params.publicToken)
        expect(request.url).to.include(encodeURIComponent(conf.params.argUrl))
        request.respond(200, { 'Content-Type': 'application/json; encoding=UTF-8' }, JSON.stringify(apiReturns()));

        expect(bids.ortb2Fragments.global.site.content.data[0].name, 'name of first content data object').to.equal(neuwo.DATA_PROVIDER)
        expect(bids.ortb2Fragments.global.site.content.data[0].segment[0].id, 'id of first segment in content.data').to.equal(TAX_ID)
      })

      it('accepts detail not available result', function () {
        let bidsConfig = bidsConfiglike()
        let comparison = bidsConfiglike()
        neuwo.getBidRequestData(bidsConfig, () => { }, config(), 'consensually')
        let request = server.requests[0];
        request.respond(404, { 'Content-Type': 'application/json; encoding=UTF-8' }, JSON.stringify({ detail: 'Basically first time seeing this' }));
        expect(bidsConfig).to.deep.equal(comparison)
      })
    })
  })
})
