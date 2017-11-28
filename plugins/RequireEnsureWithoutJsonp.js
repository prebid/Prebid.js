/**
 * RequireEnsureWithoutJsonp
 *
 * This plugin redefines the behavior of require.ensure that is used by webpack to load chunks. Usually require.ensure
 * includes code that allows the asynchronous loading of webpack chunks through jsonp requests AND includes a manifest
 * of all the build chunks so that they can be requested by name (e.g. require.ensure('./module.js'). Since that
 * functionality is not required and we plan on loading all of our chunks manually (either by concatenating all the
 * files together or including as individual scripts) we don't want the overhead of including that loading code or the
 * file manifest.  In this plugin, that code is replaced with an error message if a module is requested that hasn't been
 * loaded manually.
 *
 * @constructor
 */
function RequireEnsureWithoutJsonp() {}
RequireEnsureWithoutJsonp.prototype.apply = function(compiler) {
  compiler.plugin('compilation', function(compilation) {
    compilation.mainTemplate.plugin('require-ensure', function(_, chunk, hash) {
      return '';
    });
  });
};

module.exports = RequireEnsureWithoutJsonp;
