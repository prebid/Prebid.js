# Overview

Module Name: LiveYield Analytics Adapter

Module Type: Analytics Adapter

Maintainer: liveyield@pubocean.com

# Description

To install the LiveYield Tracker following snippet shall be added at the top of
the page.

```
(function(i,s,o,g,r,a,m,z){i['RTAAnalyticsObject']=r;i[r]=i[r]||function(){
z=Array.prototype.slice.call(arguments);z.unshift(+new Date());
(i[r].q=i[r].q||[]).push(z)},i[r].t=1,i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://rta.pubocean.com/lib/pubocean-tracker.min.js','rta');
```

# Test Parameters

The LiveYield team will provide you configurations for each of your sites, it
will be similar to:

```
{
  provider: 'liveyield',
  options: {
     // will be provided by the LiveYield team
    customerId: 'UUID',
     // will be provided by the LiveYield team,
    customerName: 'Customer Name',
     // do NOT use window.location.host, use constant value
    customerSite: 'Fixed Site Name',
    // this is used to be inline with GA 'sessionizer' which closes the session on midnight (EST-time).
    sessionTimezoneOffset: '-300'
  }
}
```

Additional documentation and support will be provided by the LiveYield team as
part of the onboarding process.

