/* eslint-disable no-console */
const express = require('express');
const argv = require('yargs').argv;
const app = module.exports = express();
const port = (argv.port) ? argv.port : 3000;
const bodyParser = require('body-parser');
const renderCreative = require('./request-middlewares/prebid-request.js');

app.use(express.static(__dirname + '/content'));
app.use(bodyParser.text({type: 'text/plain'}));

app.locals = {
  'port': port,
  'host': 'localhost'
};

// get type will be used to test prebid jsonp requests
app.get('/', renderCreative, (request, response) => {
  response.send();
});

// prebid make POST type request to ut endpoint so here we will match ut endpoint request.
app.post('/', renderCreative, (request, response) => {
  response.send();
});

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err);
  }

  console.log(`server is listening on ${port}`);
});

process.on('SIGTERM', function() { console.log('halt mock-server'); process.exit(0) });

process.on('SIGINT', function() { console.log('shutdown mock-server'); process.exit(0) });
