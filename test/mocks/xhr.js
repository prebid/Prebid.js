
export let server = sinon.createFakeServer();
export let xhr = global.XMLHttpRequest;

beforeEach(function() {
  server.restore();
  server = sinon.createFakeServer();
  xhr = global.XMLHttpRequest;
});
