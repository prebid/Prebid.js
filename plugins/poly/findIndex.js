module.exports = function (arr, pred, thisArg) {
  return arr && arr.findIndex(pred, thisArg);
}
