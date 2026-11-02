const karma = require('karma');
const process = require('process');
const karmaConfMaker = require('./karma.conf.maker.js');
const glob = require('glob');
/**
 * Environment variables:
 *
 * TEST_CHUNKS: number of chunks to split tests into, or MAX to run each test suite in isolation
 * TEST_CHUNK: run only this chunk (e.g. TEST_CHUNKS=4 TEST_CHUNK=2 gulp test) will run only the second quarter
 * TEST_ALL: set to continue running remaining chunks after a previous chunk failed
 * TEST_PAT: test file pattern (default is *_spec.js)
 */

process.on('message', function (options) {
  function info(msg) {
    // eslint-disable-next-line no-console
    console.log('\x1b[46m\x1b[30m%s\x1b[0m', msg);
  }

  function error(msg) {
    // eslint-disable-next-line no-console
    console.log('\x1b[41m\x1b[37m%s\x1b[0m', msg);
  }

  function chunkDesc(chunk) {
    return chunk.length > 1 ? `From ${chunk[0]} to ${chunk[chunk.length - 1]}` : chunk[0];
  }

  const failures = [];

  function quit(fail) {
    // eslint-disable-next-line no-console
    console.log('');
    failures.forEach(([chunkNo, chunkTot, chunk]) => {
      error(`Chunk ${chunkNo + 1} of ${chunkTot} failed: ${chunkDesc(chunk)}`);
      fail = true;
    });
    process.exit(fail ? 1 : 0);
  }

  let server = null;
  let stopping = false;

  // Exiting straight away would skip karma's shutdown, which is what kills the browsers it launched;
  // a browser left behind keeps reconnecting to port 9876 and joins the next karma's runs.
  function stop(signal) {
    if (server == null || (stopping && signal)) {
      quit();
      return;
    }
    if (stopping) return;
    stopping = true;
    // karma has its own handlers for the signals
    if (!signal) server.stop();
  }

  process.on('SIGINT', () => stop(true));
  process.on('SIGTERM', () => stop(true));
  // gulp can go away without this process being signalled, e.g. when only gulp is sent SIGINT.
  // A terminal Ctrl+C also disconnects, once gulp exits; that must not cut the shutdown short.
  process.on('disconnect', () => stop(false));

  function runKarma(file, chunkNo) {
    // `file` is a chunk of the whole suite unless --file was given; the config needs to tell
    // those apart, and cannot, since both arrive as arrays
    let cfg = karmaConfMaker(options.coverage, options.browserstack, options.watch, file, options.disableFeatures, chunkNo, options.file != null);
    if (options.browsers && options.browsers.length) {
      cfg.browsers = options.browsers;
    }
    if (options.oneBrowser) {
      cfg.browsers = [cfg.browsers.find((b) => b.toLowerCase().includes(options.oneBrowser.toLowerCase())) || cfg.browsers[0]];
    }
    cfg = karma.config.parseConfig(null, cfg);
    return new Promise((resolve, reject) => {
      server = new karma.Server(cfg, (exitCode) => {
        server = null;
        if (stopping) quit();
        exitCode ? reject(exitCode) : resolve(exitCode);
      });
      server.start();
    });
  }

  try {
    let chunks = [];
    if (options.file) {
      chunks.push([options.file]);
    } else {
      const chunkNum = process.env['TEST_CHUNKS'] ?? 1;
      const pat = process.env['TEST_PAT'] ?? '*_spec.js';
      const tests = glob.sync('test/spec/**/' + pat).sort();
      const chunkLen = chunkNum === 'MAX' ? 0 : Math.floor(tests.length / Number(chunkNum));
      chunks.push([]);
      tests.forEach((fn) => {
        chunks[chunks.length - 1].push(fn);
        if (chunks[chunks.length - 1].length > chunkLen) chunks.push([]);
      });
      chunks = chunks.filter(chunk => chunk.length > 0);
      if (chunks.length > 1) {
        info(`Splitting tests into ${chunkNum} chunks, ${chunkLen + 1} suites each`);
      }
    }
    let pm = Promise.resolve();
    chunks.forEach((chunk, i) => {
      if (process.env['TEST_CHUNK'] && Number(process.env['TEST_CHUNK']) !== i + 1) return;
      pm = pm.then(() => {
        info(`Starting chunk ${i + 1} of ${chunks.length}: ${chunkDesc(chunk)}`);
        return runKarma(chunk, i + 1);
      }).catch(() => {
        failures.push([i, chunks.length, chunk]);
        if (!process.env['TEST_ALL']) quit();
      }).finally(() => {
        info(`Chunk ${i + 1} of ${chunks.length}: done`);
      });
    });
    pm.then(() => quit());
  } catch (e) {
    // eslint-disable-next-line
    error(e);
    quit(true);
  }
});
