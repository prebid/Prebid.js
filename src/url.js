import { parseQS, formatQS } from './utils.js';

export function parse(url, options) {
  let parsed = document.createElement('a');
  if (options && 'noDecodeWholeURL' in options && options.noDecodeWholeURL) {
    parsed.href = url;
  } else {
    parsed.href = decodeURIComponent(url);
  }
  // in window.location 'search' is string, not object
  let qsAsString = (options && 'decodeSearchAsString' in options && options.decodeSearchAsString);
  return {
    href: parsed.href,
    protocol: (parsed.protocol || '').replace(/:$/, ''),
    hostname: parsed.hostname,
    port: +parsed.port,
    pathname: parsed.pathname.replace(/^(?!\/)/, '/'),
    search: (qsAsString) ? parsed.search : parseQS(parsed.search || ''),
    hash: (parsed.hash || '').replace(/^#/, ''),
    host: parsed.host || window.location.host
  };
}

export function format(obj) {
  return (obj.protocol || 'http') + '://' +
         (obj.host ||
          obj.hostname + (obj.port ? `:${obj.port}` : '')) +
         (obj.pathname || '') +
         (obj.search ? `?${formatQS(obj.search || '')}` : '') +
         (obj.hash ? `#${obj.hash}` : '');
}
