# exadsBidAdapter
EXADS PrebidJS Adapter

#### In order to mantain the adapter locally:

* Change the adapter code that you can find in `./Prebid.js/modules/exadsBidAdapter.js`
* Update the unit tests, they are in `./Prebid.js/test/spec/modules/exadsBidAdapter_spec.js`
* Run tlint and unit tests (to see the specific paragraph)
* Do manual tests (to see the specific paragraph)
* Build the new version of the adapter and all modules needed: `gulp build --modules=consentManagement,exadsBidAdapter`
* After that, you can use the prebidJS, merged with our module. 
    * You can find it in `./build/dist/prebid.js`
* Update our HTML examples in order to test the adapter. You can find them in `./exads/examples`

#### Lint and Unit tests
* Note: lint checks the official prebidJS rules.
* Also, to do the pull request to official prebidJS team, it is mondatory 80% or more of covarage. 
* To check the coverage, type:
  * `gulp test-coverage` and then
  * `gulp view-coverage`

#### Manual tests
* Copy all examples to use in the publisher test website: `./exads/doc/README.md`
* Copy the prebidJS library containing the new changes of the adapter `./build/dist/prebid.js`
* For each example, change `<script async src="js/prebid.js"></script>`, based on the publisher website configuration 
 * Note: if you need to debug the snippet code, comment the previous instruction and uncomment the `<script src="js/prebid.js"></script>` 
* Change all params based on test scenarios (to see: `./Prebid.js/modules/exadsBidAdapter.md`)
* Navigate to the publisher website and test it

#### Environments (development and production) - Changes to do in the snippet code
* Set isEnabledDebug global variable (If it is true, you will be able to see logs)

* For development environments
```
    <!-- Uncomment for development environments -->
    <script src="js/prebid.js"></script>
    <!-- Remove this line -->
    <script async src="js/prebid.js" onload="onScriptLoaded()"></script>
```
* For production environments
```
    <!-- Remove this line -->
    <script src="js/prebid.js"></script>
    <!-- Uncomment for production environments -->
    <script async src="js/prebid.js" onload="onScriptLoaded()"></script>
```