// This is an example of a server-side endpoint that is utilizing the Topics API header functionality.
// Note: This test endpoint requires the following to run: node.js, npm, express, cors, body-parser

const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');

const port = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('port', port);

const listener = app.listen(port, () => {
  const host =
    listener.address().address === '::'
      ? 'http://localhost'
      : 'http://' + listener.address().address;
  // eslint-disable-next-line no-console
  console.log(
    `${__filename} is listening on ${host}:${listener.address().port}\n`
  );
});

app.get('*', (req, res) => {
  res.setHeader('Observe-Browsing-Topics', '?1');

  const resData = {
    segment: {
      domain: req.hostname,
      topics: generateTopicArrayFromHeader(req.headers['sec-browsing-topics']),
      bidder: req.query['bidder'],
    },
    date: Date.now(),
  };

  res.json(resData);
});

const generateTopicArrayFromHeader = (topicString) => {
  const result = [];
  const topicArray = topicString.split(', ');
  if (topicArray.length > 1) {
    topicArray.pop();
    topicArray.map((topic) => {
      const topicId = topic.split(';')[0];
      const versionsString = topic.split(';')[1].split('=')[1];
      const [config, taxonomy, model] = versionsString.split(':');
      const numTopicsWithSameVersions = topicId
        .substring(1, topicId.length - 1)
        .split(' ');

      numTopicsWithSameVersions.map((tpId) => {
        result.push({
          topic: tpId,
          version: versionsString,
          configVersion: config,
          taxonomyVersion: taxonomy,
          modelVersion: model,
        });
      });
    });
  }
  return result;
};
