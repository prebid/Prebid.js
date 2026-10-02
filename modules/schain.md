# schain module

** DEPRECATED **.

This module is deprecated since prebid 10; schain may be provided directly as fpd, for example:

```typescript
pbjs.setConfig({
    ortb2: {
        source: {
            schain: {
                "ver":"1.0",
                "complete": 1,
                "nodes": [
                    {
                        "asi":"indirectseller.com",
                        "sid":"00001",
                        "hp":1
                    },

                    {
                        "asi":"indirectseller-2.com",
                        "sid":"00002",
                        "hp":1
                    }
                ]
            }
        }
    }
})
```

You may also use the [FPD validation module](https://docs.prebid.org/dev-docs/modules/validationFpdModule.html) to validate your schain configuration.


