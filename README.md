[![Build Status](https://circleci.com/gh/prebid/Prebid.js.svg?style=svg)](https://circleci.com/gh/prebid/Prebid.js)
[![Percentage of issues still open](http://isitmaintained.com/badge/open/prebid/Prebid.js.svg)](http://isitmaintained.com/project/prebid/Prebid.js "Percentage of issues still open")
[![Coverage Status](https://coveralls.io/repos/github/prebid/Prebid.js/badge.svg)](https://coveralls.io/github/prebid/Prebid.js)

# Prebid.js

> A free and open source library for publishers to quickly implement header bidding.

This README is for developers who want to contribute to Prebid.js.
Additional documentation can be found at [the Prebid homepage](http://prebid.org).
Working examples can be found in [the developer docs](http://prebid.org/dev-docs/getting-started.html).

Prebid.js is open source software that is offered for free as a convenience. While it is designed to help companies address legal requirements associated with header bidding, we cannot and do not warrant that your use of Prebid.js will satisfy legal requirements. You are solely responsible for ensuring that your use of Prebid.js complies with all applicable laws.  We strongly encourage you to obtain legal advice when using Prebid.js to ensure your implementation complies with all laws where you operate.

**Table of Contents**

- [Usage](#Usage)
- [Install](#Install)
- [Build](#Build)
- [Run](#Run)
- [Contribute](#Contribute)

<a name="Usage"></a>

## Usage (as a npm dependency)

*Note:* Requires Prebid.js v1.38.0+

Prebid.js depends on Babel and some Babel Plugins in order to run correctly in the browser.  Here are some examples for 
configuring webpack to work with Prebid.js.

With Babel 7:
```javascript
// webpack.conf.js
let path = require('path');
module.exports = {
  mode: 'production',
  module: {
    rules: [
      
      // this rule can be excluded if you don't require babel-loader for your other application files
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        }
      },
      
      // this separate rule is required to make sure that the Prebid.js files are babel-ified.  this rule will
      // override the regular exclusion from above (for being inside node_modules).
      {
        test: /.js$/,
        include: new RegExp(`\\${path.sep}prebid\\.js`),
        use: {
          loader: 'babel-loader',
          // presets and plugins for Prebid.js must be manually specified separate from your other babel rule.
          // this can be accomplished by requiring prebid's .babelrc.js file (requires Babel 7 and Node v8.9.0+)
          // as of Prebid 6, babelrc.js only targets modern browsers. One can change the targets and build for
          // older browsers if they prefer, but integration tests on ie11 were removed in Prebid.js 6.0
          options: require('prebid.js/.babelrc.js')
        }
      }
    ]
  }
}
```

Or for Babel 6:
```javascript
            // you must manually install and specify the presets and plugins yourself
            options: {
              plugins: [
                "transform-object-assign", // required (for IE support) and "babel-plugin-transform-object-assign" 
                                           // must be installed as part of your package.
                require('prebid.js/plugins/pbjsGlobals.js') // required!
              ],
              presets: [
                ["env", {                 // you can use other presets if you wish.
                  "targets": {            // this example is using "babel-presets-env", which must be installed if you
                    "browsers": [         // follow this example.
                      ... // your browser targets. they should probably match the targets you're using for the rest 
                          // of your application
                    ]
                  }
                }]
              ]
            }
```

Then you can use Prebid.js as any other npm dependency

```javascript
import pbjs from 'prebid.js';
import 'prebid.js/modules/rubiconBidAdapter'; // imported modules will register themselves automatically with prebid
import 'prebid.js/modules/appnexusBidAdapter';
pbjs.processQueue();  // required to process existing pbjs.queue blocks and setup any further pbjs.queue execution

pbjs.requestBids({
  ...
})

```



<a name="Install"></a>

## Install



    $ git clone https://github.com/prebid/Prebid.js.git
    $ cd Prebid.js
    $ npm ci

*Note:* You need to have `NodeJS` 12.16.1 or greater installed.

*Note:* In the 1.24.0 release of Prebid.js we have transitioned to using gulp 4.0 from using gulp 3.9.1.  To comply with gulp's recommended setup for 4.0, you'll need to have `gulp-cli` installed globally prior to running the general `npm ci`.  This shouldn't impact any other projects you may work on that use an earlier version of gulp in its setup.

If you have a previous version of `gulp` installed globally, you'll need to remove it before installing `gulp-cli`.  You can check if this is installed by running `gulp -v` and seeing the version that's listed in the `CLI` field of the output.  If you have the `gulp` package installed globally, it's likely the same version that you'll see in the `Local` field.  If you already have `gulp-cli` installed, it should be a lower major version (it's at version `2.0.1` at the time of the transition).

To remove the old package, you can use the command: `npm rm gulp -g`

Once setup, run the following command to globally install the `gulp-cli` package: `npm install gulp-cli -g`


<a name="Build"></a>

## Build for Development

To build the project on your local machine we recommend, running:

    $ gulp serve-and-test --file <spec_file.js>

This will run testing but not linting. A web server will start at `http://localhost:9999` serving from the project root and generates the following files:

+ `./build/dev/prebid.js` - Full source code for dev and debug
+ `./build/dev/prebid.js.map` - Source map for dev and debug
+ `./build/dev/prebid-core.js`
+ `./build/dev/prebid-core.js.map`


Development may be a bit slower but if you prefer linting and additional watch files you can also still run just:

    $ gulp serve 


### Build Optimization

The standard build output contains all the available modules from within the `modules` folder.  Note, however that there are bid adapters which support multiple bidders through aliases, so if you don't see a file in modules for a bid adapter, you may need to grep the repository to find the name of the module you need to include.

You might want to exclude some/most of them from the final bundle.  To make sure the build only includes the modules you want, you can specify the modules to be included with the `--modules` CLI argument.

For example, when running the serve command: `gulp serve --modules=openxBidAdapter,rubiconBidAdapter,sovrnBidAdapter`

Building with just these adapters will result in a smaller bundle which should allow your pages to load faster.

**Build standalone prebid.js**

- Clone the repo, run `npm ci`
- Then run the build:

        $ gulp build --modules=openxBidAdapter,rubiconBidAdapter,sovrnBidAdapter
        
Alternatively, a `.json` file can be specified that contains a list of modules you would like to include.

    $ gulp build --modules=modules.json
        
With `modules.json` containing the following
```json modules.json
[
  "openxBidAdapter",
  "rubiconBidAdapter",
  "sovrnBidAdapter"
]
```

**Build prebid.js using npm for bundling**

In case you'd like to explicitly show that your project uses `prebid.js` and want a reproducible build, consider adding it as an `npm` dependency.

- Add `prebid.js` as a `npm` dependency of your project: `npm install prebid.js`
- Run the `prebid.js` build under the `node_modules/prebid.js/` folder

        $ gulp build --modules=path/to/your/list-of-modules.json

Most likely your custom `prebid.js` will only change when there's:

- A change in your list of modules
- A new release of `prebid.js`

Having said that, you are probably safe to check your custom bundle into your project.  You can also generate it in your build process.

**Build once, bundle multiple times**

If you need to generate multiple distinct bundles from the same Prebid version, you can reuse a single build with:

```
gulp build
gulp bundle --tag one --modules=one.json
gulp bundle --tag two --modules=two.json
```

This generates slightly larger files, but has the advantage of being much faster to run (after the initial `gulp build`). It's also the method used by [the Prebid.org download page](https://docs.prebid.org/download.html).  

<a name="Run"></a>

### Excluding particular features from the build

Since version 7.2.0, you may instruct the build to exclude code for some features - for example, if you don't need support for native ads:

```
gulp build --disable NATIVE --modules=openxBidAdapter,rubiconBidAdapter,sovrnBidAdapter # substitute your module list
```

Or, if you are consuming Prebid through npm, with the `disableFeatures` option in your Prebid rule:

```javascript
  {
    test: /.js$/,
    include: new RegExp(`\\${path.sep}prebid\\.js`),
    use: {
      loader: 'babel-loader',
      options: require('prebid.js/babelConfig.js')({disableFeatures: ['NATIVE']})
    }
  }
```

**Note**: this is still a work in progress - at the moment, `NATIVE` is the only feature that can be disabled this way, resulting in a minimal decrease in size (but you can expect that to improve over time).

## Test locally

To lint the code:

```bash
gulp lint
```

To lint and only show errors

```bash
gulp lint --no-lint-warnings
```

To run the unit tests:

```bash
gulp test
```

To run the unit tests for a particular file (example for pubmaticBidAdapter_spec.js):
```bash
gulp test --file "test/spec/modules/pubmaticBidAdapter_spec.js" --nolint
```

To generate and view the code coverage reports:

```bash
gulp test-coverage
gulp view-coverage
```

Local end-to-end testing can be done with:

```bash
gulp e2e-test --local
```

For Prebid.org members with access to BrowserStack, additional end-to-end testing can be done with:

```bash
gulp e2e-test --host=test.localhost
```

To run these tests, the following items are required:
- setup an alias of localhost in your `hosts` file (eg `127.0.0.1  test.localhost`); note - you can use any alias.  Use this alias in the command-line argument above.
- access to [BrowserStack](https://www.browserstack.com/) account.  Assign the following variables in your bash_profile:
```bash
export BROWSERSTACK_USERNAME='YourUserNameHere'
export BROWSERSTACK_ACCESS_KEY='YourAccessKeyHere'
```
You can get these BrowserStack values from your profile page.

For development:

```javascript
(function() {
    var d = document, pbs = d.createElement('script'), pro = d.location.protocol;
    pbs.type = 'text/javascript';
    pbs.src = ((pro === 'https:') ? 'https' : 'http') + './build/dev/prebid.js';
    var target = document.getElementsByTagName('head')[0];
    target.insertBefore(pbs, target.firstChild);
})();
```

For deployment:

```javascript
(function() {
    var d = document, pbs = d.createElement('script'), pro = d.location.protocol;
    pbs.type = 'text/javascript';
    pbs.src = ((pro === 'https:') ? 'https' : 'http') + './build/dist/prebid.js';
    var target = document.getElementsByTagName('head')[0];
    target.insertBefore(pbs, target.firstChild);
})();
```

Build and run the project locally with:

```bash
gulp serve
```

This runs `lint` and `test`, then starts a web server at `http://localhost:9999` serving from the project root.
Navigate to your example implementation to test, and if your `prebid.js` file is sourced from the `./build/dev`
directory you will have sourcemaps available in your browser's developer tools.

To run the example file, go to:

+ `http://localhost:9999/integrationExamples/gpt/hello_world.html`

As you make code changes, the bundles will be rebuilt and the page reloaded automatically.

<a name="Contribute"></a>

## Contribute

Many SSPs, bidders, and publishers have contributed to this project. [Hundreds of bidders](https://github.com/prebid/Prebid.js/tree/master/modules) are supported by Prebid.js.

For guidelines, see [Contributing](./CONTRIBUTING.md).

Our PR review process can be found [here](https://github.com/prebid/Prebid.js/tree/master/PR_REVIEW.md).

### Add a Bidder Adapter

To add a bidder adapter module, see the instructions in [How to add a bidder adapter](https://docs.prebid.org/dev-docs/bidder-adaptor.html).

### Code Quality

Code quality is defined by `.eslintrc` and errors are reported in the terminal.

If you are contributing code, you should [configure your editor](http://eslint.org/docs/user-guide/integrations#editors) with the provided `.eslintrc` settings.

### Unit Testing with Karma

        $ gulp test --watch --browsers=chrome

This will run tests and keep the Karma test browser open. If your `prebid.js` file is sourced from the `./build/dev` directory you will also have sourcemaps available when using your browser's developer tools.

+ To access the Karma debug page, go to `http://localhost:9876/debug.html`

+ For test results, see the console

+ To set breakpoints in source code, see the developer tools

Detailed code coverage reporting can be generated explicitly with

        $ gulp test --coverage

The results will be in

        ./build/coverage

*Note*: Starting in June 2016, all pull requests to Prebid.js need to include tests with greater than 80% code coverage before they can be merged.  For more information, see [#421](https://github.com/prebid/Prebid.js/issues/421).

For instructions on writing tests for Prebid.js, see [Testing Prebid.js](http://prebid.org/dev-docs/testing-prebid.html).

### Supported Browsers

Prebid.js is supported on IE11 and modern browsers until 5.x. 6.x+ transpiles to target >0.25%; not Opera Mini; not IE11. 

### Governance
Review our governance model [here](https://github.com/prebid/Prebid.js/tree/master/governance.md).
### END
