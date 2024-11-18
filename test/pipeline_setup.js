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
