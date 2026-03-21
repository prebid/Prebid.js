module.exports = function githubRequester(github) {
  return function (verb, params) {
    return github.request(verb, Object.assign({
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }, params))
  }
}
