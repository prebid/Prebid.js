describe('adLoader', function () {
  var assert = require('chai').assert,
    adLoader = require('../../src/adloader');

  describe('trackPixel', function () {
    it('correctly appends a cachebuster query paramter to a pixel with no existing parameters', function () {
      var inputUrl = 'http://www.example.com/tracking_pixel',
        token = '?rnd=',
        expectedPartialUrl = inputUrl + token,
        actual = adLoader.trackPixel(inputUrl),
        actualPartialUrl = actual.split(token)[0] + token,
        randomNumber = parseInt(actual.split(token)[1]);
      assert.strictEqual(actualPartialUrl, expectedPartialUrl);
      assert.isNumber(randomNumber);
    });
  });

  it('correctly appends a cachebuster query paramter to a pixel with one existing parameter', function () {
    var inputUrl = 'http://www.example.com/tracking_pixel?food=bard',
      token = '&rnd=',
      expectedPartialUrl = inputUrl + token,
      actual = adLoader.trackPixel(inputUrl),
      actualPartialUrl = actual.split(token)[0] + token,
      randomNumber = parseInt(actual.split(token)[1]);
    assert.strictEqual(actualPartialUrl, expectedPartialUrl);
    assert.isNumber(randomNumber);
  });

  it('correctly appends a cachebuster query paramter to a pixel with multiple existing parameters', function () {
    var inputUrl = 'http://www.example.com/tracking_pixel?food=bard&zing=zang',
      token = '&rnd=',
      expectedPartialUrl = inputUrl + token,
      actual = adLoader.trackPixel(inputUrl),
      actualPartialUrl = actual.split(token)[0] + token,
      randomNumber = parseInt(actual.split(token)[1]);
    assert.strictEqual(actualPartialUrl, expectedPartialUrl);
    assert.isNumber(randomNumber);
  });

});
