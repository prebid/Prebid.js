import { createRequire } from 'node:module';
import { expect } from 'chai';
import { namespaceFacades } from '../vitest/plugins.mjs';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');

function transform(code) {
  return babel.transformSync(code, {
    filename: 'spec.js', configFile: false, babelrc: false, sourceType: 'module', retainLines: true, plugins: [namespaceFacades]
  }).code;
}

describe('Vitest namespace facades (test/vitest/plugins.mjs)', function () {
  it('wraps a namespace import', function () {
    const code = transform('import * as utils from \'src/utils.js\';\nutils.logError();\n');
    expect(code).to.contain('import * as __ns_utils from \'src/utils.js\'');
    expect(code).to.contain('const utils = __stubbable(__ns_utils);');
    expect(code).to.contain('import { stubbable as __stubbable } from \'/test/vitest/stubs.mjs\'');
    expect(code.split('\n')[1]).to.equal('utils.logError();');
  });

  it('wraps a namespace whose name has a $', function () {
    const code = transform('import * as $ from \'a.js\';\nimport * as a$b from \'b.js\';\n$.f(a$b);\n');
    expect(code).to.contain('const $ = __stubbable(__ns_$);');
    expect(code).to.contain('const a$b = __stubbable(__ns_a$b);');
  });

  it('wraps a namespace imported along with a default', function () {
    const code = transform('import def, * as ns from \'a.js\';\nns.f(def);\n');
    expect(code).to.contain('import def, * as __ns_ns from \'a.js\'');
    expect(code).to.contain('const ns = __stubbable(__ns_ns);');
  });

  it('leaves `import * as` in strings, template literals and comments alone', function () {
    const src = [
      'const s = "import * as fake from \'x.js\';";',
      'const t = `import * as other from \'y.js\';`;',
      '// import * as commented from \'z.js\';',
      '/* import * as block from \'w.js\'; */',
      'export { s, t };',
      ''
    ].join('\n');
    const code = transform(src);
    expect(code).to.not.contain('__stubbable');
    expect(code).to.not.contain('__ns_');
    src.split('\n').slice(0, 4).forEach(line => expect(code).to.contain(line));
  });
});
