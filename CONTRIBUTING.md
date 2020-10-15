# Contributing to Prebid.js
Contributions are always welcome. To contribute, [fork](https://help.github.com/articles/fork-a-repo/) Prebid.js,
commit your changes, and [open a pull request](https://help.github.com/articles/using-pull-requests/) against the
master branch.

Pull requests must have 80% code coverage before beign considered for merge.
Additional details about the process can be found [here](./PR_REVIEW.md).

There are more details available if you'd like to contribute a [bid adapter](https://docs.prebid.org/dev-docs/bidder-adaptor.html) or [analytics adapter](https://docs.prebid.org/dev-docs/integrate-with-the-prebid-analytics-api.html).

## Issues
[prebid.org](http://prebid.org/) contains documentation that may help answer questions you have about using Prebid.js.
If you can't find the answer there, try searching for a similar issue on the [issues page](https://github.com/prebid/Prebid.js/issues).
If you don't find an answer there, [open a new issue](https://github.com/prebid/Prebid.js/issues/new).

## Documentation
If you have a documentation issue or pull request, please open a ticket or PR in the [documentation repository](https://github.com/prebid/prebid.github.io).

## Writing Tests

Prebid uses [Mocha](http://mochajs.org/) and [Chai](http://chaijs.com/) for unit tests. [Sinon](http://sinonjs.org/)
provides mocks, stubs, and spies. [Karma](https://karma-runner.github.io/1.0/index.html) runs the tests and generates
code coverage reports at `build/coverage/lcov/lcov-report/index.html`.

Tests are stored in the [test/spec](test/spec) directory. Tests for Adapters are located in [test/spec/adapters](test/spec/adapters).
They can be run with the following commands:

- `gulp test` - run the test suite once (`npm test` is aliased to call `gulp test`)
- `gulp serve` - run the test suite once, but re-run it whenever a file in the `src` or `test` directory is modified

Before a Pull Request will be considered for merge:

- All new and existing tests must pass
- Added or modified code must have greater than 80% coverage

If you are submitting an adapter, you can also use the [Hello World](integrationExamples/gpt/hello_world.html) example page to test integration with your server.

### Test Guidelines
When you are adding code to Prebid.js, or modifying code that isn't covered by an existing test, test the code according to these guidelines:

- If the module you are working on is already partially tested by a file within the `test/spec` directory, add tests to that file
- If the module does not have any tests, create a new test file
- Group tests in a `describe` block
- Test individual units of code within an `it` block
- Within an `it` block, it may be helpful to use the "Arrange-Act-Assert" pattern
  - _Arrange_: set up necessary preconditions and inputs
    - e.g., creating objects, spies, etc.
  - _Act_: call or act on the unit under test
    - e.g., call the function you are testing with the parameters you set up
  - _Assert_: check that the expected results have occurred
    - e.g., use Chai assertions to check that the expected output is equal to the actual output
- Test the public interface, not the internal implementation
- If you need to check `adloader.loadExternalScript` in a test, use a `stub` rather than a `spy`. `spy`s trigger a network call which can result in a `script error` and cause unrelated unit tests to fail. `stub`s will let you gather information about the `adloader.loadExternalScript` call without affecting external resources
- If your test makes ajax requests, use the global xhr stub in `test/mocks/xhr`. Do not use your own `sinon.useFakeXMLHttpRequest()` or `sinon.createFakeServer()`.
- When writing tests you may use ES2015 syntax if desired
- If your test relies on `Window` or `global` object, do not mutate that object directly. Instead, create a separate copy of that object and perform operations on that new copy.

### Test Examples
Prebid.js already has many tests. Read them to see how Prebid.js is tested, and for inspiration:

- Look in `test/spec` and its subdirectories
- Tests for bidder adaptors are located in `test/spec/modules`

A test module might have the following general structure:

```JavaScript
// import or require modules necessary for the test, e.g.:
import { expect } from 'chai';  // may prefer 'assert' in place of 'expect'
import adapter from 'src/adapters/<adapter>';

describe('<Adapter>', function () {
  it('<description of unit or feature being tested>', function () {
    // Arrange - set up preconditions and inputs
    // Act - call or act on the code under test
    // Assert - use chai to check that expected results have occurred
  });

  // Add other `describe` or `it` blocks as necessary
});
```
