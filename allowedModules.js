
const sharedWhiteList = [
  'prebidjs-polyfill/arrayFrom',
  'prebidjs-polyfill/find',
  'prebidjs-polyfill/findIndex',
  'prebidjs-polyfill/includes',
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
