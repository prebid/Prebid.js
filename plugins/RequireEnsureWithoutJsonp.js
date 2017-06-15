
function RequireEnsureWithoutJsonp() {}
RequireEnsureWithoutJsonp.prototype.apply = function(compiler) {
  compiler.plugin('compilation', function(compilation) {
    compilation.mainTemplate.plugin('require-ensure', function(_, chunk, hash) {
      return (
`
if(installedChunks[chunkId] === 0)
  return callback.call(null, __webpack_require__);
else
  console.error('webpack chunk not found and jsonp disabled');
`
      ).trim();
    });
  });
};

module.exports = RequireEnsureWithoutJsonp;
