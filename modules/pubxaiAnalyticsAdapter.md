# Overview
Module Name: PubX.io Analytics Adapter
Module Type: Analytics Adapter
Maintainer: phaneendra@pubx.ai

# Description

Analytics adapter for prebid provided by Pubx.ai. Contact alex@pubx.ai for information.

# Test Parameters

```
{
  provider: 'pubxai',
    options : {
      pubxId: 'xxx',
      hostName: 'example.com',
      samplingRate: 1
    }
}
```
Property | Data Type | Is required? | Description |Example
:-----:|:-----:|:-----:|:-----:|:-----:
pubxId|string|Yes | A unique identifier provided by PubX.ai to indetify publishers.  |`"a9d48e2f-24ec-4ec1-b3e2-04e32c3aeb03"`
hostName|string|No|hostName is provided by Pubx.ai. |`"https://example.com"`
samplingRate |number |No|How often the sampling must be taken. |`2` -  (sample one in two cases) \  `3` - (sample one in three cases)
 | | | |