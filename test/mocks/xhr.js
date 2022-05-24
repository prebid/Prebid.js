import {getUniqueIdentifierStr} from '../../src/utils.js';

export let server = sinon.createFakeServer();
export let xhr = global.XMLHttpRequest;

beforeEach(function() {
  server.restore();
  server = sinon.createFakeServer();
  xhr = global.XMLHttpRequest;
});

const bid = getUniqueIdentifierStr().substring(4);
let fid = 0;

/* eslint-disable */
afterEach(function () {
  if (this?.currentTest?.state === 'failed') {
    const prepend = (() => {
      const preamble = `[Failure ${bid}-${fid++}]`;
      return (s) => s.split('\n').map(s => `${preamble} ${s}`).join('\n');
    })();


    console.log(prepend(`XHR mock state after failure (for test '${this.currentTest.fullTitle()}'): ${server.requests.length} requests`))
    server.requests.forEach((req, i) => {
      console.log(prepend(`Request #${i}:`));
      console.log(prepend(JSON.stringify(req, null, 2)));
    })
  }
});
/* eslint-enable */
