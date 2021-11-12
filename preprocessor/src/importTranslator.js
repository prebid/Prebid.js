const AST = require('abstract-syntax-tree');
const fs = require('fs');
const path = require('path');
const {SourceMapGenerator} = require('source-map');

class ImportTranslator {
  constructor({
    resolver = defaultResolver,
    // eslint-disable-next-line no-console
    emitWarning = console.warn,
    // eslint-disable-next-line no-console
    emitError = console.error
  }) {
    this.resolver = resolver;
    this.emitWarning = emitWarning;
    this.emitError = emitError;
    this.cwd = path.resolve('.')
  }

  /**
   * Translate a source file.
   * @param filename
   * @param source
   * @returns {Promise<[String, {}]>} translated source and (if any changes were made) a SourceMap object.
   */
  translate(filename, source = null) {
    let translation;
    try {
      translation = this.getTranslation(filename, source);
    } catch (e) {
      this.writeError({filename: filename}, e);
      return Promise.reject(e);
    }
    return this.shouldTranslate(translation)
      .then((shouldTranslate) => {
        if (!shouldTranslate) {
          return [source];
        } else {
          return translation.processTree()
            .then((tree) => {
              const map = new SourceMapGenerator({
                sourceRoot: this.cwd,
                file: path.relative(this.cwd, translation.filename)
              });
              const out = AST.generate(tree, {sourceMap: map});
              return [out, map.toJSON()]
            });
        }
      }).catch((err) => {
        this.writeError(translation, err);
        return Promise.reject(err);
      });
  }

  resolve(context, request) {
    if (request[0] !== '.' && request[0] !== '/') {
      context = this.cwd;
    }
    return new Promise((resolve, reject) => {
      this.resolver(context, request, (err, res) => {
        if (err != null) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    })
  }

  getTranslation(filename, source = null) {
    source = source || fs.readFileSync(filename).toString();
    return new Translation({
      translator: this,
      filename: filename,
      source: source,
      tree: new AST(source)
    })
  }

  shouldTranslate(translation) {
    return Promise.resolve(true);
  }

  /**
   * @param importSource {String} absolute path to a module being imported
   * @returns {Promise<boolean>} true if imports from this module may be replaced with a factory function
   */
  shouldReplace(importSource) {
    return Promise.resolve(false);
  }

  /**
   * @param importSource {String} absolute path to the module being imported
   * @param importName  {String} name being imported
   * @returns {Promise<[String, String]>} the module and name to be used for the factory function that replaces the import,
   *   nor null if this import should be left alone
   */
  replaceWith(importSource, importName) {
    return Promise.resolve(null);
  }

  /**
   * Specify additional imports to add to the translated output.
   * @returns {Promise<{[modulePath]: {[importName] : [localName]}}>} map from relative module path to names to be imported from that module
   */
  addImports(translation) {
    return Promise.resolve(translation.factories);
  }

  /**
   * Specify arguments for replacement factory functions.
   *
   * @param translation {Translation}
   * @param factoryModule {String}
   * @param factoryName {String}
   * @returns {Promise<[AST.Node]>}
   */
  factoryArguments(translation, factoryModule, factoryName) {
    return Promise.resolve([]);
  }

  preamble(translation) {
    return Promise.all(Object.entries(translation.factories)
      .flatMap(([module, factories]) => Object.entries(factories)
        .map(([factory, localName]) => ({module: module, name: factory, localName: localName}))
      ).map((factory) => resolveProp(factory, 'arguments', this.factoryArguments(translation, factory.module, factory.name)))
    ).then((factories) => {
      factories = Object.fromEntries(factories.map((factory) => [factory.localName, factory]));
      return Object.entries(translation.replacements).map(([localName, factoryName]) => new AST.VariableDeclaration({
        kind: 'const',
        declarations: [
          new AST.VariableDeclarator({
            id: new AST.Identifier(localName),
            init: new AST.CallExpression({
              callee: new AST.Identifier(factoryName),
              arguments: factories[factoryName].arguments
            })
          })
        ]
      }));
    })
  }


  formatLocation(source, loc) {
    const start = loc.start || loc
    const lines = source.split('\n');
    return [
      `at line ${start.line}, column ${start.column}:`,
      lines[start.line],
      ' '.repeat(start.column) + '^'
    ]
  }

  writeError({filename}, err) {
    // eslint-disable-next-line no-console
    console.error(`Cannot parse: ${filename}${err.message == null ? '' : ` (${err.message})`}`);
    if (err.loc != null) {
      // eslint-disable-next-line no-console
      this.formatLocation(err.loc).forEach(console.error)
    }
    this.emitError(err);
  }
}

class ImportMapTranslator extends ImportTranslator {
  constructor(props) {
    super(props);
    const {importMap} = props;
    this.importMap = Promise.all(
      Object.keys(importMap).map((path) => this.resolve(this.cwd, path).then((rpath) => [rpath, importMap[path]]))
    ).then((res) => Object.fromEntries(res));
  }

  shouldReplace(importSource) {
    return this.importMap.then((map) => map[importSource] != null);
  }

  replaceWith(importSource, importName) {
    return this.importMap.then((map) => map[importSource][importName]);
  }
}

class Translation {
  static CACHE_METHODS = ['resolveImports', 'importsToTranslate', 'getImportDeclarations', 'processTree']

  translator;
  filename;
  tree;
  replacements;  // {[localName]: [localFactoryName]}
  factories;     // {[factoryModule]: {[factoryName]: [localFactoryName]}}
  base;



  constructor(opts) {
    Object.assign(this, opts);
    this.base = path.dirname(this.filename);
    Translation.CACHE_METHODS.forEach((methodName) => {
      this[methodName] = runOnce(this[methodName]);
    })
  }

  resolveImports() {
    return Promise.all(
      this.tree.find('ImportDeclaration')
        .map((decl) => resolveProp({node: decl}, 'filename', this.translator.resolve(this.base, AST.serialize(decl.source))))
    );
  }

  importsToTranslate() {
    return this.resolveImports()
      .then((elems) => Promise.all(
        elems.map((elem) => resolveProp(elem, 'shouldReplace', this.translator.shouldReplace(elem.filename)))
      )).then((elems) => Promise.all(
        elems.filter((e) => e.shouldReplace)
          .map((elem) => {
            if (elem.node.specifiers == null || elem.node.specifiers.find((spec) => spec.type !== 'ImportSpecifier') != null) {
              return Promise.reject(new TranslationError('Cannot parse import that needs to be translated', this.filename, elem.node.loc));
            }
            return resolveProp(elem, 'replacements',
              Promise.all(
                elem.node.specifiers.map((spec) =>
                  this.translator.replaceWith(elem.filename, spec.imported.name)
                    .then((repl) => {
                      if (repl == null) {
                        return null;
                      }
                      const [factoryModule, factoryName] = repl;
                      return {
                        factoryModule: factoryModule,
                        factoryName: factoryName,
                        localFactoryName: this.findIdentifier(factoryName),
                        localName: spec.local.name,
                        specifier: spec,
                      }
                    })
                )
              ).then((res) => res.filter((el) => el != null))
            )
          })
      )).then((elems) => elems.filter((elem) => elem.replacements != null));
  }

  getImportDeclarations() {
    return this.translator.addImports(this)
      .then((imports) => Promise.all(
        Object.keys(imports).map((fn) => this.translator.resolve(this.translator.cwd, fn).then((path) => ({
          path: path,
          imports: imports[fn]
        })))
      )).then((imports) => {
        return imports.map((imp) => new AST.ImportDeclaration({
          source: new AST.Literal(path.relative(this.base, imp.path)),
          specifiers: Object.entries(imp.imports).map(([importName, localName]) => new AST.ImportSpecifier({
            imported: new AST.Identifier(importName),
            local: new AST.Identifier(localName)
          }))
        }))
      });
  }

  replaceNode(node, repl) {
    if (repl == null) {
      this.tree.remove(node);
    } else {
      this.tree.replace((n) => {
        if (n === node) {
          // NOTE: according to estraverse docs, it should be enough to
          // `return newNode`, but it does not appear to work (using 5.2.0).
          Object.keys(n).forEach((k) => {
            delete n[k];
          })
          Object.assign(n, repl);
        }
        return n;
      })
    }
  }

  translateImport({node, replacements}) {
    node = Object.assign({}, node);
    node.specifiers = node.specifiers.filter((spec) =>
      replacements.find((rep) => rep.specifier.imported.name === spec.imported.name) == null
    );
    if (node.specifiers.length === 0) {
      return null;
    } else {
      return node
    }
  }

  processTree() {
    return this.importsToTranslate()
      .then((imports) => {
        this.imports = imports;
        this.replacements = {};
        this.factories = {};

        imports.forEach((imp) => {
          this.replaceNode(imp.node, this.translateImport(imp));
          imp.replacements.forEach((rep) => {
            this.replacements[rep.localName] = rep.localFactoryName;
            if (this.factories[rep.factoryModule] == null) {
              this.factories[rep.factoryModule] = {};
            }
            this.factories[rep.factoryModule][rep.factoryName] = rep.localFactoryName;
          })
        });
        return Promise.all([this.getImportDeclarations(), this.translator.preamble(this)])
      }).then(([importDecl, preamble]) => {
        let i = 0;
        let node = null;
        do {
          node = this.tree.body[i];
          i++;
        } while (this.isPreamble(node));
        this.tree.replace((n) => {
          if (n === node) {
            return importDecl.concat(preamble).concat([n]);
          }
        })
        return this.tree;
      });
  }

  findIdentifier(name) {
    let i = 0;
    let idName = name;
    while (this.tree.find('Identifier').find((node) => node.name === idName) != null) {
      i += 1;
      idName = `${name}${i}`;
    }
    return idName;
  }

  isPreamble(node) {
    return (
      node.type === 'ImportDeclaration' ||
      (node.type === 'ExpressionStatement' && node.expression.type === 'Literal')
    );
  }

}

const NONE = {};

function runOnce(fn) {
  let result = NONE;
  return function () {
    if (result === NONE) {
      result = fn.apply(this);
    }
    return result;
  }
}

function defaultResolver(context, request, cb) {
  let resolved;
  try {
    resolved = path.resolve(context, request);
  } catch (e) {
    cb(e);
  }
  cb(null, resolved);
}

function resolveProp(obj, prop, promise) {
  return promise.then((result) => {
    obj[prop] = result;
    return obj;
  });
}

class TranslationError extends Error {
  constructor(message, filename, loc) {
    super(message);
    this.filename = filename;
    this.loc = loc;
  }
}

module.exports = {
  TranslationError: TranslationError,
  ImportTranslator: ImportTranslator,
  ImportMapTranslator: ImportMapTranslator,
}
