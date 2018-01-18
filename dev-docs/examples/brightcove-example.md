---
layout: player_example
title: Brightcove Player Integration
description: Show a Video Ad with the Brightcove player
top_nav_section: dev_docs
nav_section: quick-start
hide: true
beta: true
about:
- Using <code>invokeVideoPlayer</code> to set up and access the <a href="https://support.brightcove.com/getting-started-brightcove-player">Brightcove Player</a> instance.
- Using the <a href="https://support.brightcove.com/player-catalog#getVideo">catalog API</a> to load a media file dynamically.
- Using <code>bc()</code> to make sure all the necessary scripts are loaded before playing an ad.
- Playing an ad using Brightcove's <a href="https://support.brightcove.com/advertising-ima3-plugin">ima3 plugin</a>.
- Configuring the player's ima3 settings on page.
player_notes:
- For this demo we'll be configuring the player's ima3 settings on the page instead of in Video Cloud. Make sure you load the ima3 script and CSS file in addition to your player script.
- On the publish page for the player, choose the <b>Advanced</b> embed code (not <b>Standard</b>).
jsfiddle_link: jsfiddle.net/prebid/dd4wd8z7/32/embedded/html/
- If you're playing a preroll ad, do not include the videoID in the video element.
demo_link: prebid.org/examples/video/bc-demo.html
code_lines: 154
code_height: 4600
use_old_example_style: false
pid: 32
---
