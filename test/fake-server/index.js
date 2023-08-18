/* eslint-disable no-console */

const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const argv = require('yargs').argv;
const fakeResponder = require('./fake-responder.js');
const bundleMaker = require('./bundle.js');

const PORT = argv.port || '4444';

// Initialize express app
const app = express();

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'text/plain' }));
app.use(morgan('dev')); // used to log incoming requests

// Allow Cross Origin request from 'test.localhost:9999'
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

app.get('/bundle', bundleMaker, (req, res) => {
  res.send();
});

app.post('/appnexus', fakeResponder, (req, res) => {
  res.send();
});

app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(PORT, () => {
  console.log(`fake-server listening on http://localhost:${PORT}`);
});
