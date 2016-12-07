---
layout: bidder
title: Fidelity
description: Prebid Fidelity Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: fidelity
biddercode_longer_than_12: false
---

### bid params

{: .table .table-bordered .table-striped } 

| Name 	 | Scope    | Description        				 | Example  				|
| :------| :--------| :--------------------------------------------------| :------------------------------------|
| zoneid | required | The ad zone or tag specific ID 			 | `"27248"` 				|
| loc  	 | optional | The web page URL location  			 | `"http://site.com/page.html"` 	|
| click  | optional | The placeholder for third party click tracking URL | `"http://tracker.com&click="` 	|
| subid  | optional | The placeholder for SubID  			 | `"hb by default"` 			|
| server | optional | Bidder Domain  					 | `"x.fidelity-media.com by default"` 	|