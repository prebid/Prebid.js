const express = require('express');
const app = express();
const cors = require('cors');

// mock NAPS response
const mockResponse = require('./mock-response.json');

// cors
app.use(cors({
  origin: 'http://test.localhost:9999',
  credentials: true,
}));

const port = 3000;

app.get('/', (req, res) => res.send('Hello World!'))

app.post('/naps', (req, res) => {
  res.json(mockResponse);
});

app.listen(port, () => console.log(`Example app listening on port ${port}`));
