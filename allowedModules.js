
const sharedWhiteList = [
  'core-js-pure/features/array/find', // no ie11
  'core-js-pure/features/array/includes', // no ie11
  'core-js-pure/features/set', // ie11 supports Set but not Set#values
  'core-js-pure/features/string/includes', // no ie11
  'core-js-pure/features/number/is-integer', // no ie11,
  'core-js-pure/features/array/from' // no ie11
];

module.exports = {
  'modules': [
    ...sharedWhiteList,
    'criteo-direct-rsa-validate',
    'jsencrypt',
    'crypto-js',
    'live-connect' // Maintained by LiveIntent : https://github.com/liveintent-berlin/live-connect/
  ],
  'src': [
    ...sharedWhiteList,
    'fun-hooks/no-eval',
    'just-clone',
    'dlv',
    'dset',
    'deep-equal'
  ]
};
