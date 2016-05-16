---
layout: post
title: HTTPS proof comes to Prebid and all its adaptors

description: Prebid.js and all its adaptors now fully support HTTPS.

permalink: /blog/prebid-https

---

### Background

Many publishers require their users load some of, or all of their pages securely via HTTPS. The main motivation for HTTPS is authentication of the visited website and protection of the privacy and integrity of the exchanged data. [source](https://en.wikipedia.org/wiki/HTTPS).

<br>

### What does it mean that HTTPS has come to Prebid and all its adaptors?

**1. Prebid.js library can be loaded securely via HTTPS.**

When the prebid.js library is loaded securely via HTTPS, it will auto ensure the adaptors are also loaded securely via HTTPS. The adaptors should also return the bid responses and ads securely via HTTPS.

**2. All adaptors that Prebid.js supports can be loaded securely.**

Some adaptors may load external Javascript. During the prebid.js adaptor certification process, we ensure these external Javascript are also loaded securely via HTTPS. 

**3. All bid responses and ads returned by the adaptors are via HTTPS.**

When a page is loaded securely via HTTPS, all the data exchange and communication have to be in HTTPS. This includes the data coming back from the servers as well. 

<br>

### How to turn on HTTPS for prebid?

Load prebid.js library via HTTPS. [All examples](/dev-docs/examples/basic-example.html) documented on Prebid.org provide examples for how to load prebid.js via HTTPS.

