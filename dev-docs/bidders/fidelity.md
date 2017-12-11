---
layout: bidder
title: Fidelity Media
description: Prebid Fidelity Media Bidder Adapter
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: fidelity
biddercode_longer_than_12: false
prebid_1_0_supported : true
---

### bid params

{: .table .table-bordered .table-striped } 

| Name 	 | Scope    | Description        					 			 | Example  							|
| :------| :--------| :--------------------------------------------------| :------------------------------------|
| zoneid | required | The ad zone or tag specific ID 					 | `"27248"` 							|
| floor	 | optional | The floor CPM price for the request				 | `0.1234` 							|
| server | optional | Bidder domain  					 				 | `"x.fidelity-media.com" by default` 	|