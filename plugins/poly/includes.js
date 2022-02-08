module.exports = function (target, elem, start) {
  return (target && target.includes(elem, start)) || false;
}
