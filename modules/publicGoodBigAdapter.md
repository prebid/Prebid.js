# Overview

**Module Name**: Public Good Bidder Adapter\
**Module Type**: Bidder Adapter\
**Maintainer**: publicgood@publicgood.com

# Description

Public Good's bid adapter is for use with approved publishers only.  Any publisher who wishes to integrate with Pubic Good using the this adapter will need a partner ID.

Please contact Public Good for additional information and a negotiated set of slots.  

# Test Parameters
```
{
        bidder: 'publicgood',
        params: {
          partnerId: 'prebid-test',
          slotId: 'test'
        }
}
```

# Publisher Parameters
```
{
        bidder: 'publicgood',
        params: {
          partnerId: '-- partner ID provided by public good --',
          slotId: 'all | -- optional slot identifier --'
        }
}
```