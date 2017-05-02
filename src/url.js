export function parseQS(query) {
  return !query ? {} : query
    .replace(/^\?/, '')
    .split('&')
    .reduce((acc, criteria) => {
      let [k, v] = criteria.split('=');
      if (/\[\]$/.test(k)) {
        k = k.replace('[]', '');
        acc[k] = acc[k] || [];
        acc[k].push(v);
      } else {
        acc[k] = v || '';
      }
      return acc;
    }, {});
}

export function formatQS(query) {
  return Object
    .keys(query)
    .map(k => Array.isArray(query[k]) ?
      query[k].map(v => `${k}[]=${v}`).join('&') :
      `${k}=${query[k]}`)
    .join('&');
}

export function parse(url) {
  let parsed = document.createElement('a');
  parsed.href = decodeURIComponent(url);
  return {
    protocol: (parsed.protocol || '').replace(/:$/, ''),
    hostname: parsed.hostname,
    port: +parsed.port,
    pathname: parsed.pathname.replace(/^(?!\/)/,'/'),
    search: parseQS(parsed.search || ''),
    hash: (parsed.hash || '').replace(/^#/, ''),
    host: parsed.host
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
