module.exports = (function(settings) {
	var browsers = require('./browsers.json');
	for(var browser in browsers) {
		var desiredCapabilities = {
			"browserName": browsers[browser].browser,
			"version": browsers[browser].browser_version,
      "platform": browsers[browser].os,
			"os": browsers[browser].os,
      "os_version": browsers[browser].os_version,
      "browser": browsers[browser].browser,
      "browser_version": browsers[browser].browser_version,
		};

		settings.test_settings[browser] = {}
		settings.test_settings[browser]['desiredCapabilities'] = desiredCapabilities;
	}
	return settings;

})(require('./nightwatch.browserstack.json'));
