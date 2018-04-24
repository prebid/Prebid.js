---
layout: bidder
title: Widespace
description: Prebid Widespace Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: widespace
prebid_1_0_supported : true
biddercode_longer_than_12: false


---

### Bid params

| Name  | Scope    | Description         | Example |
| :---- | :------- | :------------------ | :------ |
| sid   | required | Widespace Ad Space ID | `'00000000-0000-0000-0000-000000000000'` |
| currency   | Optional | Currency | `'EUR'` |
| bidFloor   | Optional | Bid floor rate | `'1.25'` |
| demo   | Optional | User's demographic data | `{}` |
| demo.gender   | Optional | User's demographic data | `gender: 'M'` |
| demo.country   | Optional | Country name | `country: 'Sweden'` |
| demo.region   | Optional | Region name | `region: 'Stockholm'` |
| demo.city   | Optional | City name | `city: 'Stockholm'` |
| demo.postal   | Optional | Postal code | `postal: '11153'` |
| demo.yob   | Optional | Year of birth | `yob: '1984'` |
