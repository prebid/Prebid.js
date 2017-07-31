---
redirect_to: https://github.com/prebid/Prebid.js/blob/master/CONTRIBUTING.md
layout: page
title: Testing Prebid.js
description: How to write tests for the Prebid.js library
pid: 199

top_nav_section: dev_docs
hide: true
---

<div class="bs-docs-section" markdown="1">

# Testing  Prebid.js
{: .no_toc}

Starting on 21 June 2016, all pull requests to the Prebid.js library will need to include tests with greater than 80% code coverage for any changed/added code before they can be merged into master.

For more information, see Prebid.js issue [#421](https://github.com/prebid/Prebid.js/issues/421).

This page describes how to test code in the Prebid.js repository to help prepare your pull request.

* TOC
{:toc}

## Writing tests

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

## Running tests

After checking out the Prebid.js repository and installing dev dependencies with `npm install`, use the following commands to run tests as you are working on code:

- `gulp test` will run the test suite once (`npm test` is aliased to call `gulp test`)
- `gulp serve` will run tests once and stay open, re-running tests whenever a file in the `src` or `test` directory is modified

## Checking results and code coverage

Check the test results using these guidelines:

- Look at the total number of tests run, passed, and failed (shown below the rainbow Nyan Cat in the shell window).
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

## Examples

Prebid.js already has lots of tests. Read them to see how Prebid.js is tested, and for inspiration:

- Look in `test/spec` and its subdirectories
- Tests for bidder adaptors are located in `test/spec/adapters`

A test module might have the following general structure:

{% highlight js %}

// Import or require modules necessary for the test, e.g.:
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

{% endhighlight %}

## Resources

The Prebid.js testing stack contains some of the following tools. It may be helpful to consult their documentation during the testing process.

- [Mocha - test framework](http://mochajs.org/)
- [Chai - BDD/TDD assertion library](http://chaijs.com/)
- [Sinon - spy, stub, and mock library](http://sinonjs.org/)

</div>
