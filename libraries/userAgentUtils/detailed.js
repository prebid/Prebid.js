export function detectDeviceType(ua = navigator.userAgent) {
  const lowerUA = ua.toLowerCase();
  if (/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(lowerUA)) return 5;
  if (/iphone|ipod|android|blackberry|opera|mini|windows\\sce|palm|smartphone|iemobile/i.test(lowerUA)) return 4;
  if (/smart[-_\s]?tv|hbbtv|appletv|googletv|hdmi|netcast|viera|nettv|roku|bdtv\b|sonydtv|inettvbrowser|\btv\b/i.test(lowerUA)) return 3;
  return 2;
}

export function getOsBrowserInfo(ua = navigator.userAgent, platform = navigator.platform, appVersion = navigator.appVersion, vendor = navigator.vendor, opera = window.opera) {
  const module = {
    header: [platform, ua, appVersion, vendor, opera],
    dataos: [
      { name: 'Windows Phone', value: 'Windows Phone', version: 'OS' },
      { name: 'Windows', value: 'Win', version: 'NT' },
      { name: 'iOS', value: 'iPhone', version: 'OS' },
      { name: 'iOS', value: 'iPad', version: 'OS' },
      { name: 'Kindle', value: 'Silk', version: 'Silk' },
      { name: 'Android', value: 'Android', version: 'Android' },
      { name: 'PlayBook', value: 'PlayBook', version: 'OS' },
      { name: 'BlackBerry', value: 'BlackBerry', version: '/' },
      { name: 'Macintosh', value: 'Mac', version: 'OS X' },
      { name: 'Linux', value: 'Linux', version: 'rv' },
      { name: 'Palm', value: 'Palm', version: 'PalmOS' }
    ],
    databrowser: [
      { name: 'Yandex Browser', value: 'YaBrowser', version: 'YaBrowser' },
      { name: 'Opera Mini', value: 'Opera Mini', version: 'Opera Mini' },
      { name: 'Amigo', value: 'Amigo', version: 'Amigo' },
      { name: 'Atom', value: 'Atom', version: 'Atom' },
      { name: 'Opera', value: 'OPR', version: 'OPR' },
      { name: 'Edge', value: 'Edge', version: 'Edge' },
      { name: 'Internet Explorer', value: 'Trident', version: 'rv' },
      { name: 'Chrome', value: 'Chrome', version: 'Chrome' },
      { name: 'Firefox', value: 'Firefox', version: 'Firefox' },
      { name: 'Safari', value: 'Safari', version: 'Version' },
      { name: 'Internet Explorer', value: 'MSIE', version: 'MSIE' },
      { name: 'Opera', value: 'Opera', version: 'Opera' },
      { name: 'BlackBerry', value: 'CLDC', version: 'CLDC' },
      { name: 'Mozilla', value: 'Mozilla', version: 'Mozilla' }
    ],
    getVersion: function(name, version) {
      if (name === 'Windows') {
        switch (parseFloat(version).toFixed(1)) {
          case '5.0': return '2000';
          case '5.1': return 'XP';
          case '5.2': return 'Server 2003';
          case '6.0': return 'Vista';
          case '6.1': return '7';
          case '6.2': return '8';
          case '6.3': return '8.1';
          default: return version || 'other';
        }
      }
      return version || 'other';
    },
    matchItem: function(string, data) {
      let regex, regexv, match, matches, version;
      for (let i = 0; i < data.length; i++) {
        regex = new RegExp(data[i].value, 'i');
        match = regex.test(string);
        if (match) {
          regexv = new RegExp(data[i].version + '[- /:;]([\\d._]+)', 'i');
          matches = string.match(regexv);
          version = '';
          if (matches && matches[1]) {
            matches = matches[1];
          }
          if (matches) {
            matches = matches.split(/[._]+/);
            for (let j = 0; j < matches.length; j++) {
              version += (j === 0 ? matches[j] + '.' : matches[j]);
            }
          } else {
            version = 'other';
          }
          return { name: data[i].name, version: this.getVersion(data[i].name, version) };
        }
      }
      return { name: 'unknown', version: 'other' };
    },
    init: function() {
      const agent = this.header.join(' ');
      return { os: this.matchItem(agent, this.dataos), browser: this.matchItem(agent, this.databrowser) };
    }
  };
  return module.init();
}

export function parseUserAgentDetailed(ua = navigator.userAgent) {
  const device = detectDeviceType(ua);
  const info = getOsBrowserInfo(ua);
  return {
    devicetype: device,
    os: info.os.name,
    osv: info.os.version,
    browser: info.browser.name,
    browserv: info.browser.version
  };
}
