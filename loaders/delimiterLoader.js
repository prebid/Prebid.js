// Copyright 2016 AOL Platforms.

/**
 * @author Marian Rusnak <marian.rusnak@teamaol.com>
 */

module.exports = function(content) {
  var adapterName = this.resourcePath.slice(this.resourcePath.lastIndexOf('/') + 1, -3);
  // Intentionally added 'window=window;' after the comment so it is not removed.
  // It is probably a bug in UglifyJS that the comment is not recognized as comment node.
  // I will look at it later.
  // TODO(marian.rusnak): Investigate and fix Uglify comments recognition and removal.
  return `/*!ADAPTER BEGIN ${adapterName}*/window=window;${content}/*!ADAPTER END ${adapterName}*/window=window;`;
};
