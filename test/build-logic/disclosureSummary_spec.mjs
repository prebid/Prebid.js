import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import merge from 'merge-stream';
import { PassThrough } from 'node:stream';
import { disclosureSummary } from '../../gulp.disclosureSummary.js';

function collect(stream) {
  return new Promise((resolve, reject) => {
    const files = [];
    stream.on('data', file => files.push(file));
    stream.on('error', reject);
    stream.on('end', () => resolve(files));
  });
}

describe('disclosureSummary', () => {
  let unhandled;
  function onUnhandled(err) {
    unhandled.push(err);
  }
  beforeEach(() => {
    unhandled = [];
    process.on('unhandledRejection', onUnhandled);
  });
  afterEach(async () => {
    // give a stray rejection a chance to surface before checking for it
    await new Promise(resolve => setImmediate(resolve));
    process.off('unhandledRejection', onUnhandled);
    expect(unhandled).to.eql([]);
  });

  it('emits the summary as one file', async () => {
    const files = await collect(disclosureSummary(['moduleA'], 'summary.json', {
      getMetadata: () => null
    }));
    expect(files.map(file => file.path)).to.eql(['summary.json']);
    expect(JSON.parse(files[0].contents.toString())).to.be.an('array');
  });

  it("reads the modules' metadata with the given reader", async () => {
    const requested = [];
    await collect(disclosureSummary(['moduleA', 'moduleB'], 'summary.json', {
      loadSummary: async () => ({
        getStorageDisclosureSummary: (modules, getMetadata) => modules.map(getMetadata)
      }),
      getMetadata: (name) => {
        requested.push(name);
        return null;
      }
    }));
    expect(requested).to.eql(['moduleA', 'moduleB']);
  });

  it("fails the stream when a module's metadata can't be read", async () => {
    const stream = disclosureSummary(['moduleA'], 'summary.json', {
      getMetadata: () => JSON.parse('{ broken')
    });
    try {
      await collect(stream);
      expect.fail('the stream did not fail');
    } catch (e) {
      expect(e).to.be.instanceOf(SyntaxError);
    }
  });

  it("fails the stream when the summary library can't be loaded", async () => {
    const failure = new Error('cannot load');
    try {
      await collect(disclosureSummary(['moduleA'], 'summary.json', { loadSummary: () => Promise.reject(failure) }));
      expect.fail('the stream did not fail');
    } catch (e) {
      expect(e).to.equal(failure);
    }
  });

  it('fails the merged bundle stream, as the bundle task merges it with the code', async () => {
    const code = new PassThrough({ objectMode: true });
    code.end();
    const bundle = merge(code, disclosureSummary(['moduleA'], 'summary.json', {
      getMetadata: () => {
        throw new Error('unreadable metadata');
      }
    }));
    try {
      await collect(bundle);
      expect.fail('the bundle stream did not fail');
    } catch (e) {
      expect(e.message).to.equal('unreadable metadata');
    }
  });
});
