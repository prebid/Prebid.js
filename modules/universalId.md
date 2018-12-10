module

test if local storage/cookies are enabled
* if neither is enabled, exit
* else add enabled types to enabledStorageTypes

test if any universal ids are set in configuration
* if none exist, exit

iterate sub-modules, for each submodule
1. check if configuration exists with matching sub-module config name: 
  * skip sub-module if none exists
  
2. validate sub-module config storage props and params
  * syncDelay (optional)
  
  * storage (required)
    * type (required)
    * name (required)
    * expires (required)
    
  * params (optional)
    * partnerCode
    * url
  
3. if syncDelay exists, use setTimeout with callback wrapping next function, else call immediately
   
4. use storage key and type to retrieve stored value
  * if stored value exists, add value to data array for adding to bid request
  * else, call sub-module getId method to retrieve
  

add ttl
each module can override the sync delay
some modules can override the setTimeout if they will not impact prebid bootstrap
  
  polling agent errors - connection timed out
  
