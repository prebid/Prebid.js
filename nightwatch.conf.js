module.exports = (function(settings) {
  var browsers = require('./browsers.json');
  delete browsers['bs_ie_9_windows_7'];

  for (var browser in browsers) {
    if (browsers[browser].browser === 'iphone') continue;

    var desiredCapabilities = {
      'browserName': browsers[browser].browser,
      'version': browsers[browser].browser_version,
      'platform': browsers[browser].os,
      'os': browsers[browser].os,
      'os_version': browsers[browser].os_version,
      'browser': browsers[browser].browser,
      'browser_version': browsers[browser].browser_version,
    };

    settings.test_settings[browser] = {
      'silent': true,
      'exclude': ['custom-assertions', 'custom-commands', 'common', 'custom-reporter'],
      'screenshots': {
        'enabled': false,
        'path': ''
      },
      'javascriptEnabled': true,
      'acceptSslCerts': true,
      'browserstack.local': true,
      'browserstack.debug': true,
      'browserstack.selenium_version': '2.53.0',
      'browserstack.user': `${BROWSERSTACK_USERNAME}`,
      'browserstack.key': `${BROWSERSTACK_KEY}`
    };
    settings.test_settings[browser]['desiredCapabilities'] = desiredCapabilities;
  }
  return settings;
})(require('./nightwatch.browserstack.json'));
