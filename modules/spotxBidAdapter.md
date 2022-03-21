# Overview

```
Module Name: SpotX Bidder Adapter
Module Type: Bidder Adapter
Maintainer: teameighties@spotx.tv
```

# Description

Connect to SpotX for bids.

This adapter requires setup and approval from the SpotX team.

# Test Parameters - Use case #1 - outstream with default rendering options
```
    var adUnits = [{
        code: 'something',
        mediaTypes: {
            video: {
                context: 'outstream', // 'instream' or 'outstream'
                playerSize: [640, 480]
            }
        },
        bids: [{
            bidder: 'spotx',
            params: {
                channel_id: 85394,
                ad_unit: 'outstream',
                outstream_options: { // Needed for the default outstream renderer - fields video_slot/content_width/content_height are mandatory
                    slot: 'adSlot1',
                    content_width: 300,
                    content_height: 250
                }
            }
        }]
    }];
```

# Test Parameters - Use case #2 - outstream with default rendering options + some other options
```
    var adUnits = [{
        code: 'something',
        mediaTypes: {
            video: {
                context: 'outstream', // 'instream' or 'outstream'
                playerSize: [640, 480]
            }
        },
        bids: [{
            bidder: 'spotx',
            params: {
                channel_id: 85394,
                ad_unit: 'outstream',
                outstream_options: {
                    slot: 'adSlot1',
                    custom_override: { // This option is not mandatory though used to override default renderer parameters using EASI player options in here: https://developer.spotxchange.com/content/local/docs/sdkDocs/EASI/README.md
                        content_width: 300,
                        content_height: 250,
                        collapse: '1',
                        hide_fullscreen: '1',
                        unmute_on_mouse: '1',
                        continue_out_of_view: '1',
                        ad_volume: '100',
                        content_container_id: 'video1',
                        hide_skin: '1',
                        spotx_all_google_consent: '1'
                    }
                }
            }
        }]
    }];
```

# Test Parameters - Use case #3 - outstream with your own outstream redering function
```
    var adUnits = [{
        code: 'something',
        mediaTypes: {
            video: {
                context: 'outstream', // 'instream' or 'outstream'
                playerSize: [640, 480]
            }
        },
        bids: [{
            bidder: 'spotx',
            params: {
                channel_id: 79391,
                ad_unit: 'outstream',
                outstream_function: myOutstreamFunction // Override the default outstream renderer by this referenced function
            }
        }]
    }];
```

# Sample of a custom outstream rendering function
```
function myOutstreamFunction(bid) {
    const videoDiv = 'video1';
    const playerWidth = 300;
    const playerHeight = 250;

    window.console.log('[SPOTX][renderer] Handle SpotX custom outstream renderer');
    let script = window.document.createElement('script');
    script.type = 'text/javascript';
    script.src = '//js.spotx.tv/easi/v1/' + bid.channel_id + '.js';
    script.setAttribute('data-spotx_channel_id', '' + bid.channel_id);
    script.setAttribute('data-spotx_vast_url', '' + bid.vastUrl);
    script.setAttribute('data-spotx_content_width', playerWidth);
    script.setAttribute('data-spotx_content_height', playerHeight);
    script.setAttribute('data-spotx_content_page_url', bid.renderer.config.content_page_url);
    if (bid.renderer.config.ad_mute) {
        script.setAttribute('data-spotx_ad_mute', '0');
    }
    script.setAttribute('data-spotx_ad_unit', 'incontent');
    script.setAttribute('data-spotx_collapse', '0');
    script.setAttribute('data-spotx_hide_fullscreen', '1');
    script.setAttribute('data-spotx_autoplay', '1');
    script.setAttribute('data-spotx_blocked_autoplay_override_mode', '1');
    script.setAttribute('data-spotx_video_slot_can_autoplay', '1');
    script.setAttribute('data-spotx_unmute_on_mouse', '1');
    script.setAttribute('data-spotx_click_to_replay', '1');
    script.setAttribute('data-spotx_continue_out_of_view', '1');
    script.setAttribute('data-spotx_ad_volume', '100');
    if (bid.renderer.config.inIframe && window.document.getElementById(bid.renderer.config.inIframe).nodeName == 'IFRAME') {
        let rawframe = window.document.getElementById(bid.renderer.config.inIframe);
        let framedoc = rawframe.contentDocument;
        if (!framedoc && rawframe.contentWindow) {
            framedoc = rawframe.contentWindow.document;
        }
        framedoc.body.appendChild(script);
    } else {
        window.document.getElementById(videoDiv).appendChild(script);
    }
};
```
