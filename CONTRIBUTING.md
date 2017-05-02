# Contributing to Prebid.js
Contributions are always welcome. To contribute, [fork](https://help.github.com/articles/fork-a-repo/) Prebid.js, commit your changes, and [open a pull request](https://help.github.com/articles/using-pull-requests/).

## Pull Requests
Please make sure that pull requests are scoped to one change, and that any added or changed code includes tests with greater than 80% code coverage. See [Testing Prebid.js](#testing-prebidjs) for help on writing tests.

## Issues
[prebid.org](http://prebid.org/) contains documentation that may help answer questions you have about using Prebid.js. If you can't find the answer there, try searching for a similar issue on the [issues page](https://github.com/prebid/Prebid.js/issues). If you don't find an answer there, [open a new issue](https://github.com/prebid/Prebid.js/issues/new).

## Documentation
If you have a documentation issue or pull request, please open a ticket or PR in the [documentation repository](https://github.com/prebid/prebid.github.io).

## Testing Prebid.js
Pull requests to the Prebid.js library will need to include tests with greater than 80% code coverage for any changed/added code before they can be merged into master.

This section describes how to test code in the Prebid.js repository to help prepare your pull request.

### Writing tests
When you are adding code to Prebid.js, or modifying code that isn't covered by an existing test, test the code according to these guidelines:

- If the module you are working on is already partially tested by a file within the `test` directory, add tests to that file
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
- If using global `pbjs` data structures in your test, take care to not completely overwrite them with your own data as that may affect other tests relying on those structures, e.g.:
    - **OK**: `pbjs._bidsRequested.push(bidderRequestObject);`
    - **NOT OK**: `pbjs._bidsRequested = [bidderRequestObject];`
- If you need to check `adloader.loadScript` in a test, use a `stub` rather than a `spy`. `spy`s trigger a network call which can result in a `script error` and cause unrelated unit tests to fail. `stub`s will let you gather information about the `adloader.loadScript` call without affecting external resources
- When writing tests you may use ES2015 syntax if desired

### Running tests
After checking out the Prebid.js repository and installing dev dependencies with `npm install`, use the following commands to run tests as you are working on code:

- `gulp test` will run the test suite once (`npm test` is aliased to call `gulp test`)
- `gulp serve` will run tests once and stay open, re-running tests whenever a file in the `src` or `test` directory is modified

### Checking results and code coverage
Check the test results using these guidelines:

- Look at the total number of tests run, passed, and failed in the shell window.
- If all tests are passing, great.
- Otherwise look for errors printed in the console for a description of the failing test.
- You may need to iterate on your code or tests until all tests are passing.
- Make sure existing tests still pass.
- There is a table below the testing report that shows code coverage percentage, for each file under the `src` directory.
- Each time you run tests, a code coverage report is generated in `build/coverage/lcov/lcov-report/index.html`.
- This is a static HTML page that you can load in your browser.
- On that page, navigate to the file you are testing to see which lines are being tested.
- Red indicates that a line isn't covered by a test.
- Gray indicates a line that doesn't need coverage, such as a comment or blank line.
- Green indicates a line that is covered by tests.
- The code you have added or modified must have greater than 80% coverage to be accepted.

### Examples
Prebid.js already has lots of tests. Read them to see how Prebid.js is tested, and for inspiration:

- Look in `test/spec` and its subdirectories
- Tests for bidder adaptors are located in `test/spec/adapters`

A test module might have the following general structure:

```JavaScript
// import or require modules necessary for the test, e.g.:
import { expect } from 'chai';  // may prefer 'assert' in place of 'expect'
import adapter from 'src/adapters/<adapter>';

describe('<Adapter>', () => {
  it('<description of unit or feature being tested>', () => {
    // Arrange - set up preconditions and inputs
    // Act - call or act on the code under test
    // Assert - use chai to check that expected results have occurred
  });

  // Add other `describe` or `it` blocks as necessary
});
```

### Resources
The Prebid.js testing stack contains some of the following tools. It may be helpful to consult their documentation during the testing process.

- [Mocha - test framework](http://mochajs.org/)
- [Chai - BDD/TDD assertion library](http://chaijs.com/)
- [Sinon - spy, stub, and mock library](http://sinonjs.org/)
