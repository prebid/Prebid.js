export class BaseAdapter {
  constructor(code) {
    this.code = code;
  }

  getCode() {
    return this.code;
  }

  setCode(code) {
    this.code = code;
  }

  callBids() {
    throw 'adapter implementation must override callBids method';
  }
}
