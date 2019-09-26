var fs = require('fs.extra');
var path = require('path');
var ejs = require('ejs');

module.exports = new function() {
  var tmpl = __dirname + '/junit.xml.ejs';
  var tmplData;
  var globalResults;

  function loadTemplate(cb) {
    if (tmplData) {
      cb(tmplData);
      return;
    }
    fs.readFile(tmpl, function (err, data) {
      if (err) {
        throw err;
      }
      tmplData = data.toString();
      cb(tmplData);
    });
  }

  function adaptAssertions(module) {
    Object.keys(module.completed).forEach(function(item) {
      var testcase = module.completed[item];
      var assertions = testcase.assertions;
      for (var i = 0; i < assertions.length; i++) {
        if (assertions[i].stackTrace) {
          assertions[i].stackTrace = stackTraceFilter(assertions[i].stackTrace.split('\n'));
        }
      }

      if (testcase.failed > 0 && testcase.stackTrace) {
        var stackParts = testcase.stackTrace.split('\n');
        var errorMessage = stackParts.shift();
        testcase.stackTrace = stackTraceFilter(stackParts);
        testcase.message = errorMessage;
      }
    });
  }

  function writeReport(moduleKey, data, opts, callback) {
    var module = globalResults.modules[moduleKey];
    var pathParts = moduleKey.split(path.sep);
    var moduleName = pathParts.pop();
    var output_folder = opts.output_folder;
    adaptAssertions(module);

    var rendered = ejs.render(data, {
      module: module,
      moduleName: moduleName,
      systemerr: globalResults.errmessages.join('\n'),
    });

    if (pathParts.length) {
      output_folder = path.join(output_folder, pathParts.join(path.sep));
      fs.mkdirpSync(output_folder);
    }

    var filename = path.join(output_folder, opts.filename_prefix + moduleName + '.xml');
    fs.writeFile(filename, rendered, function(err) {
      callback(err);
      globalResults.errmessages.length = 0;
    });
  }

  function stackTraceFilter(parts) {
    var stack = parts.reduce(function(list, line) {
      if (contains(line, [
        'node_modules',
        '(node.js:',
        '(events.js:'
      ])) {
        return list;
      }

      list.push(line);
      return list;
    }, []);

    return stack.join('\n');
  }

  function contains(str, text) {
    if (Object.prototype.toString.call(text) === '[object Array]') {
      for (var i = 0; i < text.length; i++) {
        if (contains(str, text[i])) {
          return true;
        }
      }
    }
    return str.indexOf(text) > -1;
  }

  this.write = function(results, options, callback) {
    options.filename_prefix = process.env.__NIGHTWATCH_ENV + '_';
    globalResults = results;
    var keys = Object.keys(results.modules);

    loadTemplate(function createReport(data) {
      var moduleKey = keys.shift();

      writeReport(moduleKey, data, options, function(err) {
        if (err || (keys.length === 0)) {
          callback(err);
        } else {
          createReport(data);
        }
      });
    });
  };
}();
