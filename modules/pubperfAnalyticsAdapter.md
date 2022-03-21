# Overview

```
Module Name: Pubperf Analytics Adapter
Module Type: Analytics Adapter
Maintainer: support@transfon.com
```

# Description

Transfon's pubperf analytics adaptor allows you to view detailed auction and prebid information in Meridian. Contact support@transfon.com for more information or to sign up for analytics.

For more information, please visit https://www.pubperf.com.


# Sample pubperf tag to be placed before prebid tag

```
(function(i, s, o, g, r, a, m, z) {i['pubperf_pbjs'] = r;i[r] = i[r] || function() {z = Array.prototype.slice.call(arguments);z.unshift(+new Date());(i[r].q = i[r].q || []).push(z)}, i[r].t = 1, i[r].l = 1 * new Date();a = s.createElement(o),m = s.getElementsByTagName(o)[0];a.async = 1;a.src = g;m.parentNode.insertBefore(a, m)})(window, document, 'script', 'https://t.pubperf.com/t/b5a635e307.js', 'pubperf_pbjs');
```

# Test Parameters
```
{
  provider: 'pubperf'
}
```
