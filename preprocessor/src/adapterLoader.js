const {AdapterTranslator} = require('./adapterTranslator.js');

module.exports = function (source) {
  const translator = new AdapterTranslator({
    resolve: this.resolve,
    emitError: this.emitError,
    emitWarning: this.emitWarning
  });
  const callback = this.async();
  translator.translate(this.resourcePath, source)
    .then((res) => callback(null, ...res))
    .catch((err) => callback(err));
};
