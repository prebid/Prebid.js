
const sharedWhiteList = [
];

module.exports = {
  'modules': [
    ...sharedWhiteList,
    'criteo-direct-rsa-validate',
    'crypto-js',
    'live-connect' // Maintained by LiveIntent : https://github.com/liveintent-berlin/live-connect/
  ],
  'src': [
    ...sharedWhiteList,
    'fun-hooks/no-eval',
    'just-clone',
    'dlv',
    'dset'
  ]
};
