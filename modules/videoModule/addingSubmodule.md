# How to Add a Video Submodule

Video submodules interact with the Video Module to integrate Prebid with Video Players, allowing Prebid to automatically:
- render bids in the desired video player
- mark used bids as won
- trigger player and media events
- populate the oRTB Video Impression and Content params in the bid request

## Overview

The Prebid Video Module simplifies the way Prebid integrates with video players by acting as a single point of contact for everything video.
In order for the Video Module to connect to a video player, a submodule must be implemented. The submodule acts as a bridge between the Video Module and the video player.
The Video Module will route commands and tasks to the appropriate submodule instance.
A submodule is expected to work for a specific video player. i.e. the JW Player submodule is used to integrate Prebid with JW Player. The video.js submdule connects to video.js.
Publishers who use players from different vendors on the same page can use multiple video submodules.

## Requirements

The Video Module only supports integration with Video Players that meet the following requirements:
- Must support parsing and reproduction of VAST ads
    - Input can be an ad tag URL or the actual Vast XML.
- Must expose an API that allows the procurement of [Open RTB params](https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-API-Specification-Version-2-5-FINAL.pdf) for Video (section 3.2.7) and Content (section 3.2.16).
- Must emit javascript events for Ads and Media
    - see [Event Registration](#event-registration)

## Creating a Submodule

### Step 1: Add a markdown file describing the submodule

Create a markdown file under `modules` with the name of the module suffixed with 'VideoProvider', i.e. `exampleVideoProvider.md`.

Example markdown file:
```markdown
# Overview

Module Name: Example Video Provider
Module Type: Video Submodule
Video Player: Example player
Player website: example-player.com
Maintainer: someone@example.com

# Description

Video provider for Example Player. Contact someone@example.com for information.

# Requirements

Your page must link the Example Player build from our CDN. Alternatively yu can use npm to load the build.
```

### Step 2: Add a Vendor Code

Vendor codes are required to indicate which submodule type to instantiate. Add your vendor code constant to an export const in `vendorCodes.js` in Prebid.js under `libraries/video/constants/vendorCodes.js`.
i.e. in `vendorCodes.js`:

```javascript
export const EXAMPLE_PLAYER_VENDOR = 3;
```

### Step 2: Build the Module

Now create a javascript file under `modules` with the name of the module suffixed with 'VideoProvider', e.g., `exampleVideoProvider.js`.

#### The Submodule factory

The Video Module will need a submodule instance for every player instance registered with Prebid. You will therefore need to implement a submodule factory which is called with a `videoProviderConfig` argument and returns a Video Provider instance.
Your submodule should import your vendor code constant and set it to a `vendorCode` property on your submodule factory.
Your submodule should also import the `submodule` function from `src/hook.js` and should use it to register as a submodule of `'video'`.

**Code Example**

```javascript
import { submodule } from '../src/hook.js';

function exampleSubmoduleFactory(videoProviderConfig) {
    const videoProvider = {
      // implementation
    };

  return videoProvider;
}

exampleSubmoduleFactory.vendorCode = EXAMPLE_VENDOR;
submodule('video', exampleSubmoduleFactory);
```

#### The Submodule object

The submodule object must adhere to the `VideoProvider` interface defined in the `coreVideo.js` inline documentation.

|  param name | type  | Scope | Description | Arguments | Return type |
| :---------- | :---- | :---- | :---------- | :-------- | :---------- |
| init | function | required | Initializes the submodule and the video player, if not already instantiated. | n/a | void |
| getId | function | required | Returns the divId (unique identifier) of the associated video player. | n/a | string |
| getOrtbVideo | function | required | Returns the oRTB Video object for the associated video player. See [oRTB spec’s](https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-API-Specification-Version-2-5-FINAL.pdf) video section 3.2.7. | n/a | object |
| getOrtbContent | function | required | Returns the oRTB Content object for the associated video player and its media's metadata. See [oRTB spec’s](https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-API-Specification-Version-2-5-FINAL.pdf)  content section 3.2.16. | n/a | object |
| setAdTagUrl | function | required | Requests that the video player load and begin playing the given ad tag url. | adTagUrl: string | void |
| onEvent | function | required | Registers event listeners for the given event strings to the player instance. | externalEventName: string, callback: function, basePayload: object | void |
| offEvent | function | required | Removes event listeners for the given event strings to the player instance. | event: string, callback: function | void |
| destroy | function | required | Deallocates the submodule and destroys the associated video player. n/a | void | void |

For example:
```javascript
const exampleSubmodule =  {
    init: init,
    getId: getId,
    getOrtbVideo: getOrtbVideo,
    getOrtbContent: getOrtbContent,
    setAdTagUrl: setAdTagUrl,
    onEvent: onEvent,
    offEvent: offEvent,
    destroy: destroy
};
```

<a name="event-registration" />

#### Event registration

Submodules must support attaching and detaching event listeners on the video player. The list of events and their respective params are defined in the [Video Module docs's Events section]({{site.github.url}}/prebid-video/video-module.html#events).

##### onEvent

| argument name | type | description |
| ------------- | ---- | ----------- |
| event | string | Name of event for which the listener should be added |
| callback | function | Function that will get called when the event is triggered. The function will be called with a payload argument containing metadata for the event |
| basePayload | object | Base payload for every event; includes common parameters such as divId and type. The event payload should be built on top of this |

##### offEvent

| argument name | type | description |
| ------------- | ---- | ----------- |
| event | string | name of event for which the attached listener should be removed |
| callback | function | function that was assigned as a callback when the listener was added |

#### Update .submodules.json

In prebid.js, add your new submodule to `.submodules.json` under the `videoModule` as such:
{% highlight text %}
```
{
  "parentModules": {
    "videoModule": [
      "exampleVideoProvider"
    ]
  }
}
```

### Shared resources for developers

A video library containing reusable code and constants has been added to Prebid.js for your convenience. We encourage you to import from this library.
Constants such as event names can be found in the `libraries/video/constants/` folder.
