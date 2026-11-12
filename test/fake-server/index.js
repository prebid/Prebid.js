/* eslint-disable no-console */

const express = require('express');
const morgan = require('morgan');
const path = require('path');
const { parseArgs } = require('node:util');
const msftHandler = require('./responders/msft.js');
const tripleliftHandler = require('./responders/triplelift.js');
const bundleMaker = require('./bundle.js');

const { values: argv } = parseArgs({
  strict: false,
  allowPositionals: true,
  options: {
    port: { type: 'string' },
  },
});

const PORT = argv.port || '4444';

// Initialize express app
const app = express();

app.use('/static', express.static(path.join(__dirname, 'static')));

// Middlewares
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));
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

app.post('/msft', msftHandler, (req, res) => {
  res.send();
});

app.post('/triplelift', tripleliftHandler, (req, res) => {
  res.send();
});

// Analytics collector and landing page for e2e click tests. Data is kept per `run` query parameter,
// so retries and parallel sessions don't see each other's requests.
const analytics = {};
const landings = {};

app.post('/analytics', (req, res) => {
  const run = String(req.query.run);
  (analytics[run] = analytics[run] || []).push(req.body);
  res.send();
});

app.get('/analytics', (req, res) => {
  const run = String(req.query.run);
  res.json({ landed: landings[run] === true, analytics: analytics[run] || [] });
});

app.get('/landing', (req, res) => {
  landings[String(req.query.run)] = true;
  res.type('html').send('<!DOCTYPE html><html><head><title>landing</title></head><body><p id="landed">landed</p></body></html>');
});

app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(PORT, () => {
  console.log(`fake-server listening on http://localhost:${PORT}`);
});
