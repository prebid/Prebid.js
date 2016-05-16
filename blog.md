---
layout: blog
title: Blog
head_title: Prebid.js Blog for Header Bidding
description: A collection of helpful tips for implementing header bidding with prebid.js.
pid: 6
hide: true

---



{% for post in site.posts %}

<div class="row">

	<div class="col-md-3">
		<div class="blog-date">
			{{ post.date | date: '%B %d, %Y' }}
		</div>
	</div>

	<div class="col-md-9" role="main">

		<div class="bs-docs-section">
		  <h1><a href="{{ post.url }}">{{ post.title }}</a></h1>
		  {{ post.content }}
		</div>

	</div>

</div>

{% endfor %}
