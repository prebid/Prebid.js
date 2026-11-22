import { expect } from 'chai';
import { ESLint, RuleTester } from 'eslint';
import rule from '../../plugins/eslint/noSynchronousLayoutRead.js';

const cached = "import { getWinDimensions } from '../../src/utils.js';";
const error = { message: /Avoid synchronous layout reads/ };

new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } }).run('no-synchronous-layout-read', rule, {
  valid: [
    `${cached} getWinDimensions().document.body.scrollHeight;`,
    `${cached} const dims = getWinDimensions(); const doc = dims.document; doc.body.scrollHeight;`,
    `${cached} const { body } = getWinDimensions().document; const { scrollHeight } = body;`,
    `${cached} const { document: { documentElement: html } } = getWinDimensions(); html.clientWidth;`,
    "import { getWinDimensions as dimensions } from '../../src/utils/winDimensions.js'; dimensions().innerHeight;",
    "import * as utils from '../../src/utils.js'; const dims = utils.getWinDimensions(); dims.scrollY;",
    'window.scrollTop = 10;',
    'const getComputedStyle = () => ({}); getComputedStyle();'
  ],
  invalid: [
    ...[
      'element.offsetWidth;',
      "element['clientHeight'];",
      "element?.['scrollHeight'];",
      'element[`clientWidth`];',
      'const { scrollHeight: height } = document.body;',
      'const { body: { scrollHeight } } = document;',
      'let height; ({ clientHeight: height } = document.body);',
      'function read({ offsetHeight }) {}',
      'const read = ({ offsetHeight }) => {};',
      'const read = ({ offsetHeight } = {}) => {};',
      'const read = function ({ offsetHeight }) {};',
      'getComputedStyle(element);',
      'window.getComputedStyle(element);',
      "window['getComputedStyle'](element);",
      'const { getComputedStyle: style } = window;',
      'const getWinDimensions = () => window; getWinDimensions().innerWidth;',
      "import { getWinDimensions } from './untrusted.js'; getWinDimensions().innerWidth;",
      `${cached} let dims = getWinDimensions(); dims = window; dims.innerWidth;`,
      `${cached} function read(getWinDimensions) { getWinDimensions().innerWidth; }`,
      `${cached} getWinDimensions.untrusted().innerWidth;`,
      `${cached} const dims = getWinDimensions(); function read(dims) { dims.innerWidth; }`,
      'window.scrollTop += 10;'
    ].map(code => ({ code, errors: [error] })),
  ]
});

describe('synchronous layout lint configuration', () => {
  const eslint = new ESLint();

  for (const filePath of ['modules/exampleBidAdapter.js', 'modules/exampleRtdProvider.ts', 'modules/exampleAnalyticsAdapter.js']) {
    it(`preserves existing restrictions and adds layout errors for ${filePath}`, async () => {
      const [result] = await eslint.lintText("document.cookie = 'x'; window.localStorage.getItem('x'); navigator.sendBeacon('/'); element.getBoundingClientRect(); element.offsetWidth;", { filePath });
      expect(result.messages.filter(message => message.ruleId === 'no-restricted-properties')).to.have.length(4);
      expect(result.messages.filter(message => message.ruleId === 'prebid/no-synchronous-layout-read')).to.have.length(1);
      expect(result.messages.filter(message => message.ruleId === 'prebid/no-synchronous-layout-read')[0].severity).to.equal(2);
    });
  }

  for (const filePath of ['modules/adagioRtdProvider.js', 'modules/contxtfulRtdProvider.js']) {
    it(`keeps only the layout exception for ${filePath}`, async () => {
      const [result] = await eslint.lintText("document.cookie = 'x'; element.offsetWidth;", { filePath });
      expect(result.messages.filter(message => message.ruleId === 'no-restricted-properties')).to.have.length(1);
      expect(result.messages.filter(message => message.ruleId === 'prebid/no-synchronous-layout-read')).to.have.length(0);
    });
  }
});
