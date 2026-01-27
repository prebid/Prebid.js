import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import argv from 'yargs';
import https from 'https';
import fs from 'fs';
import {bundle} from './bundle.mjs';
import {auction} from './prebidServer.mjs';
import execaCommand from 'execa';

const PORT = argv.port || '4444';

// Initialize express app
const app = express();

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'text/plain' }));
app.use(morgan('dev')); // used to log incoming requests

app.use('/pages', express.static('../e2e/pages'));

app.use('/pbs/auction', auction)

app.use('/bundle', bundle)

app.use((req, res) => {
  res.status(404).send('Not Found');
});

async function generateCert() {
  if (!fs.existsSync('./ssl/cert.key')) {
    await execaCommand('openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl/cert.key -out ./ssl/cert.pem -config ./ssl/req.cnf -sha256', {stdio: 'inherit', shell: true});
  }
}
await generateCert();

https.createServer({
  key: fs.readFileSync('ssl/cert.key'),
  cert: fs.readFileSync('ssl/cert.pem')
}, app).listen(PORT, () => {
  console.log(`server listening on https://localhost:${PORT}`);
});
