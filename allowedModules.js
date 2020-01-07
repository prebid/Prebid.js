
const sharedWhiteList = [
  "core-js/library/fn/array/find", // no ie11
  "core-js/library/fn/array/includes", // no ie11
  "core-js/library/fn/set", // ie11 supports Set but not Set#values
  "core-js/library/fn/string/includes", // no ie11
  "core-js/library/fn/number/is-integer", // no ie11,
  "core-js/library/fn/array/from" // no ie11
];

module.exports = {
  'modules': [
    ...sharedWhiteList,
    'jsencrypt',
    'crypto-js'
  ],
  'src': [
    ...sharedWhiteList,
    'fun-hooks/no-eval',
    'just-clone',
    'dlv',
    'dset'
  ]
};
