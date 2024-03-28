# dchain module

Refer:
- https://iabtechlab.com/buyers-json-demand-chain/

## Sample code for dchain setConfig and dchain object
```
pbjs.setConfig({
  "dchain": {
    "validation": "strict"
  }
});
```

```
bid.meta.dchain: {
  "complete": 0,
  "ver": "1.0",
  "ext": {...},
  "nodes": [{
    "asi": "abc",
    "bsid": "123",
    "rid": "d4e5f6",
    "name": "xyz",
    "domain": "mno",
    "ext": {...}
  }, ...]
}
```

## Workflow
The dchain module is not enabled by default as it may not be necessary for all publishers.
If required, dchain module can be included as following
```
    $ gulp build --modules=dchain,pubmaticBidAdapter,openxBidAdapter,rubiconBidAdapter,sovrnBidAdapter
```

The dchain module will validate a bidder's dchain object (if it was defined).  Bidders should assign their dchain object into `bid.meta` field.  If the dchain object is valid, it will remain in the bid object for later use.

If it was not defined, the dchain will create a default dchain object for prebid.

## Validation modes
- ```strict```: It is the default validation mode. In this mode, dchain object will not be accpeted from adapters if it is invalid. Errors are thrown for invalid dchain object.
- ```relaxed```: In this mode, errors are thrown for an invalid dchain object but the invalid dchain object is still accepted from adapters.
- ```off```: In this mode, no validations are performed and dchain object is accepted as is from adapters.