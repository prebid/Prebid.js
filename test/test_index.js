[it, describe].forEach((ob) => {
  ob.only = function () {
    [
      'describe.only and it.only are disabled unless you provide a single spec --file,',
      'because they can silently break the pipeline tests',
      // eslint-disable-next-line no-console
    ].forEach(l => console.error(l))
    throw new Error('do not use .only()')
  };
});

[it, describe].forEach((ob) => {
  ob.skip = function () {
    [
      'describe.skip and it.skip are disabled,',
      'because they pollute the pipeline test output',
      // eslint-disable-next-line no-console
    ].forEach(l => console.error(l))
    throw new Error('do not use .skip()')
  };
});

require('./test_deps.js');

const testsContext = require.context('.', true, /_spec$/);
let specs = testsContext.keys().filter(fn => fn.startsWith('.'));

if (TEST_SHARD) {
  const [shard, numShards] = TEST_SHARD.split('.').map(el => parseInt(el, 10));
  specs = specs.filter((el, i) => (i % numShards) + 1 === shard)
}

specs.forEach(testsContext);

window.$$PREBID_GLOBAL$$.processQueue();
