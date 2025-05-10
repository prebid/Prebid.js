# Overview

```
Module Name:  Lemmadigital Bid Adapter
Module Type:  Bidder Adapter
Maintainer: lemmadev@lemmatechnologies.com
```

# Description

Connects to Lemma exchange for bids.
Lemmadigital bid adapter supports Video, Banner formats.

# Sample Banner Ad Unit: For Publishers
```
var adUnits = [{
  code: 'div-lemma-ad-1',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600]],  // required
    }
  },
  // Replace this object to test a new Adapter!
  bids: [{
    bidder: 'lemmadigital',
    params: {
      pubId: 1, // required
      adunitId: '3768', // required
      latitude: 37.3230,
      longitude: -122.0322,
      device_type: 2
    }
  }]
}];
```

# Sample Video Ad Unit: For Publishers
```
var adUnits = [{
  mediaTypes: {
    video: {
      playerSize: [640, 480], // required
      context: 'instream'
    }
  },
  // Replace this object to test a new Adapter!
  bids: [{
    bidder: 'lemmadigital',
    params: {
      pubId: 1, // required
      adunitId: '3769', // required
      latitude: 37.3230,
      longitude: -122.0322,
      device_type: 4,
      video: {
        mimes: ['video/mp4','video/x-flv'],   // required
      }
    }
  }]
}];
```
