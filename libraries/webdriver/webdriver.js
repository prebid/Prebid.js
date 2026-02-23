import {isFingerprintingApiDisabled} from '../fingerprinting/fingerprinting.js';
import {getFallbackWindow} from '../../src/utils.js';

/**
 * Warning: accessing navigator.webdriver may impact fingerprinting scores when this API is included in the built script.
 * @param {Window} [win] Window to check (defaults to top or self)
 * @returns {boolean}
 */
export function isWebdriverEnabled(win) {
  if (isFingerprintingApiDisabled('webdriver')) {
    return false;
  }
  return getFallbackWindow(win).navigator?.webdriver === true;
}

/**
 * Detects Selenium/WebDriver via document/window properties (e.g. __webdriver_script_fn, attributes).
 * @param {Window} [win] Window to check
 * @param {Document} [doc] Document to check (defaults to win.document)
 * @returns {boolean}
 */
export function isSeleniumDetected(win, doc) {
  if (isFingerprintingApiDisabled('webdriver')) {
    return false;
  }
  const _win = win || (typeof window !== 'undefined' ? window : undefined);
  const _doc = doc || (_win?.document);
  if (!_win || !_doc) return false;
  const checks = [
    'webdriver' in _win,
    '_Selenium_IDE_Recorder' in _win,
    'callSelenium' in _win,
    '_selenium' in _win,
    '__webdriver_script_fn' in _doc,
    '__driver_evaluate' in _doc,
    '__webdriver_evaluate' in _doc,
    '__selenium_evaluate' in _doc,
    '__fxdriver_evaluate' in _doc,
    '__driver_unwrapped' in _doc,
    '__webdriver_unwrapped' in _doc,
    '__selenium_unwrapped' in _doc,
    '__fxdriver_unwrapped' in _doc,
    '__webdriver_script_func' in _doc,
    _doc.documentElement?.getAttribute('selenium') !== null,
    _doc.documentElement?.getAttribute('webdriver') !== null,
    _doc.documentElement?.getAttribute('driver') !== null
  ];
  return checks.some(Boolean);
}
