# Adviverse Bid Adapter

# Overview

```
Module Name: Adviverse Bid Adapter
Module Type: Bidder Adapter
Maintainer: partners@adviverse.com
```

# Description

Connects publishers to the Adviverse ad network (https://adviverse.com) through
client-side header bidding. Supports the banner and video (instream / outstream)
media types.

Each ad unit needs the `tagKey` of an Adviverse placement, found in the Adviverse
dashboard. Video ad units need the tag key of an Adviverse video placement; the
bid carries VAST in `vastXml`. Outstream units need a renderer configured on the
ad unit.

GDPR (TCF) and US Privacy consent strings are forwarded to the endpoint. The
adapter stores nothing on the device and registers no user syncs.

# Bid Params

| Name     | Scope    | Description                        | Example     | Type     |
|----------|----------|------------------------------------|-------------|----------|
| `tagKey` | required | Adviverse placement tag key        | `'tk_test'` | `string` |

# Test Parameters

```js
const adUnits = [
  {
    code: 'test-banner',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    bids: [
      {
        bidder: 'adviverse',
        params: {
          tagKey: 'tk_test',
        },
      },
    ],
  },
  {
    code: 'test-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
      },
    },
    bids: [
      {
        bidder: 'adviverse',
        params: {
          tagKey: 'tk_test',
        },
      },
    ],
  },
];
```
