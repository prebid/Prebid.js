import { RuleTester } from 'eslint';
import globals from 'globals';
import rule from '../../plugins/eslint/noWindowTop.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.browser }
});

const errors = [{ message: /^Use getWindowTop\(\)/ }];

ruleTester.run('no-window-top', rule, {
  valid: [
    'getWindowTop().document.title;',
    'getParentWindow(win);',
    'el.style.top = "0px";',
    'const rect = getBoundingClientRect(el); rect.top;',
    'node.parent.parent;',
    'function f(top) { return top.document; }',
    'const parent = {}; parent.x = 1;',
    "'<script>window.parent.postMessage(1)</script>';",
  ],
  invalid: [
    'window.top.document;',
    'window.parent.postMessage(1);',
    'self.top;',
    'globalThis.parent;',
    'win.top.location;',
    'currentWindow.parent;',
    'w.frameElement;',
    'window.frameElement;',
    'getWindowSelf().parent;',
    'utils.getWindowTop().parent;',
    'res.window.top;',
    'top.location.href;',
    'parent.window.x = 1;',
    'if (self === top) {}',
    'frameElement.style;',
  ].map(code => ({ code, errors })),
});
