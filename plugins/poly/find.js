module.exports = function (arr, pred, thisArg) {
  return arr && arr.find(pred, thisArg);
}
