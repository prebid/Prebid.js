---
layout: player_example
title: JW Cloud Player Integration
description: Show a Video Ad in a Cloud Hosted JW Player
top_nav_section: dev_docs
nav_section: quick-start
hide: true
beta: true
about:
- Setting up JW Player to dynamically play ads.
- Using a cloud-hosted JW player.
- Using invokeVideoPlayer to set up and access the JW Player instance.
- Dynamically inserting a pre-roll ad into JW Player.
player_notes:
- You must have the correct JW Player license that allows you to play advertising.
- The different methods of embedding JW Player on your site can be found <a href="https://support.jwplayer.com/customer/portal/articles/1406723-mp4-video-embed">here</a>. 
- For this example we will be using method 1, a cloud-hosted player and JW Platform hosted content. To see an example using the self-hosted player, click <a href="/dev-docs/examples/jw-selfhost-example.html">here</a>.
- No matter what embedding method you choose to use, you must follow the <b>custom embed</b> instructions. You cannot use the single-line embed.
- If you're using a cloud-hosted player, <b>do not enable advertising in the platform</b>. We'll do it on page so that we can use the vast url from prebid.
- You can set up most of your player's settings in the platform. The platform settings will be used unless overridden on the page in the setup call.
jsfiddle_link: jsfiddle.net/zt70zj9z/21/embedded/html/
demo_link: prebid.org/examples/video/jwPlatformPrebidDemo.html
code_lines: 137
code_height: 3540

use_old_example_style: false

pid: 30
---
