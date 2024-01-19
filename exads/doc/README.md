# exadsBidAdapter
Exads PrebidJS Adapter

#### In order to mantain the adapter locally:

* Changing the adapter code that you can find into `./Prebid.js/modules/exadsBidAdapter.js`
* Updating the unit tests, they are into `./Prebid.js/test/spec/modules/exadsBidAdapter_spec.js`
* Running tlint and unit tests (to see the specific paragraph)
* Doing manual tests (to see the specific paragraph)
* Building the new version of the adapter and all modules needed: `gulp build --modules=consentManagement,exadsBidAdapter`
* After that you can use the prebidJS merged with our module. 
* You can find it into:  `./build/dist/prebid.js`
* Updating our examples. You can find them into `./exads/examples`

#### Lint and Unit tests
* Note: lint checks the official prebidJS rules.
* Also, to do the pull request to official prebidJS team, it is mondatory 80% or more of covarage. 
* To check the coverage, type:
  * `gulp test-coverage` and then
  * `gulp view-coverage`

#### Manual tests
* Copying all examples to use into the publisher test web site: `./exads/doc/README.md`
* Copying the prebidJS library containing the new changes of the adapter `./build/dist/prebid.js`
* For each example, changing `<script async src="js/prebid.js"></script>` based on the publisher web site configuration 
 * Note: if you need to debug the snippet code, comment the previous instruction and uncomment the `<script src="js/prebid.js"></script>` 
* Changing all params based on test scenarios (to see: `./Prebid.js/modules/exadsBidAdapter.md`)
* Navigating to the publisher web site and test it

#### Environments (development and production) - Changes to do into the snippet code
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