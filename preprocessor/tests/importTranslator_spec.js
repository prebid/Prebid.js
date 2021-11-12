/* eslint-disable */
const {expect} = require('chai');
const {ImportMapTranslator} = require('../src/importTranslator.js');
const {TranslationError} = require('../src/importTranslator');

function fail() {
  return Promise.reject('promise did not fail');
}

describe('ImportMapTranslator', () => {
  let translator;

  beforeEach(() => {
    translator = new ImportMapTranslator({
      importMap: {
        'someFile.js': {
          'importName': ['factory.js', 'factory']
        },
        'someOtherFile.js': {
          'importName1': ['factory1.js', 'factory1'],
          'importName2': ['factory2.js', 'factory2']
        }
      }
    })
  })
  describe('importsToTranslate', () => {
    const getImports = (src) => translator.getTranslation('test_filename.js', src).importsToTranslate();

    [
      ['default imports', (fn) => `import defaultExport from "${fn}";`],
      ['star imports', (fn) => `import * as glob from "${fn}";`]
    ].forEach(([test, src]) => {
      it(`should fail on ${test} if the file is in importMap`, () => {
        return getImports(src('someFile.js'))
          .then(fail)
          .catch((e) => expect(e).to.be.instanceof(TranslationError))
      });

      it(`should NOT fail on ${test} if the file is not in importMap`, () => {
        return getImports(src('randomOtherFile.js'))
          .then((res) => {
            expect(res).to.have.length(0);
          })
      })
    });

    it('should parse simple mapped imports', () => {
      return getImports('import {importName} from "someFile.js";').then((imports) => {
        expect(imports).to.have.length(1);
        expect(imports[0].replacements).to.have.length(1);
        const repl = imports[0].replacements[0];
        expect(repl).to.include({
          factoryModule: 'factory.js',
          factoryName: 'factory',
          localName: 'importName',
          localFactoryName: 'factory'
        });
      })
    });

    it('should handle multiple import specifiers when only some are mapped', () => {
      return getImports('import {importName, missingName} from "someFile.js"')
        .then((res) => {
          expect(res).to.have.length(1);
          expect(res[0].replacements).to.have.length(1);
        })
    });

    it('should handle multiple mapped import specifiers', () => {
      return getImports('import {importName1, importName2} from "someOtherFile.js";')
        .then((res) => {
          expect(res).to.have.length(1);
          expect(res[0].replacements.map((i) => i.factoryName)).to.eql(['factory1', 'factory2'])
        })
    });

    it('should handle local identifiers', () => {
      return getImports('import {importName as localName} from "someFile.js";')
        .then((res) => {
          expect(res[0].replacements[0]).to.include({
            factoryName: 'factory',
            localName: 'localName',
          })
        })
    })

    it('should not choose factory names that clash with existing identifiers', () => {
      return getImports('import {importName} from "someFile.js"; const factory = null;')
        .then((res) => {
          expect(res[0].replacements[0]).to.include({
            localName: 'importName',
            factoryName: 'factory',
            localFactoryName: 'factory1'
          })
        })
    });

  });

  describe('translateImport', () => {
    const translate = (elem) => translator.getTranslation('testFilename.js', '//').translateImport(elem);

    it('Should return null if all specifiers are to be replaced', () => {
      expect(translate({
        node: {
          specifiers: [
            {
              imported: {
                name: 'importName1'
              }
            }
          ]
        },
        replacements: [
          {
            specifier: {
              imported: {
                name: 'importName1'
              }
            }
          }
        ]
      })).to.equal(null);
    });

    it('should modify the node to remove specifiers to be replaced', () => {
      const elem = {
        node: {
          specifiers: [
            {
              imported: {
                name: 'importName1',
              }
            },
            {
              imported: {
                name: 'someUnmappedName'
              }
            }
          ]
        },
        replacements: [
          {
            specifier: {
              imported: {
                name: 'importName1'
              }
            }
          }
        ]
      };
      const tr = translate(elem);
      expect(tr.specifiers).to.have.length(1);
      expect(tr.specifiers[0].imported.name).to.equal('someUnmappedName');
    });
  });

});
