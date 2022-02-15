
export class ConsentHandler {
  #enabled;
  #data;
  #promise;
  #resolve;
  #ready;

  constructor() {
    this.reset();
  }

  /**
   * reset this handler (mainly for tests)
   */
  reset() {
    this.#promise = new Promise((resolve) => {
      this.#resolve = (data) => {
        this.#ready = true;
        this.#data = data;
        resolve(data);
      };
    });
    this.#enabled = false;
    this.#data = null;
    this.#ready = false;
  }

  /**
   * Enable this consent handler. This should be called by the relevant consent management module
   * on initialization.
   */
  enable() {
    this.#enabled = true;
  }

  /**
   * @returns {boolean} true if the related consent management module is enabled.
   */
  get enabled() {
    return this.#enabled;
  }

  /**
   * @returns {boolean} true if consent data has been resolved (it may be `null` if the resolution failed).
   */
  get ready() {
    return this.#ready;
  }

  /**
   * @returns a promise than resolves to the consent data, or null if no consent data is available
   */
  get promise() {
    if (!this.#enabled) {
      this.#resolve(null);
    }
    return this.#promise;
  }

  setConsentData(data) {
    this.#resolve(data);
  }

  getConsentData() {
    return this.#data;
  }
}
