import {cmpClient, MODE_CALLBACK, MODE_RETURN} from '../../../../libraries/cmp/cmpClient.js';

describe('cmpClient', () => {
  function mockWindow(props = {}) {
    let listeners = [];
    const win = {
      addEventListener: sinon.stub().callsFake((evt, listener) => {
        evt === 'message' && listeners.push(listener)
      }),
      removeEventListener: sinon.stub().callsFake((evt, listener) => {
        evt === 'message' && (listeners = listeners.filter((l) => l !== listener));
      }),
      postMessage: sinon.stub().callsFake((msg) => {
        listeners.forEach(ln => ln({data: msg}))
      }),
      ...props,
    };
    win.top = win.parent?.top || win;
    return win;
  }

  it('should return undefined when there is no CMP', () => {
    expect(cmpClient({apiName: 'missing'}, mockWindow())).to.not.exist;
  });

  it('should return undefined when parent is inaccessible', () => {
    const win = mockWindow();
    win.top = mockWindow();
    expect(cmpClient({apiName: 'missing'}, win)).to.not.exist;
  })

  describe('direct access', () => {
    let mockApiFn;
    beforeEach(() => {
      mockApiFn = sinon.stub();
    })
    Object.entries({
      'on same frame': () => mockWindow({mockApiFn}),
      'on parent frame': () => mockWindow({parent: mockWindow({parent: mockWindow({parent: mockWindow(), mockApiFn})})}),
    }).forEach(([t, mkWindow]) => {
      describe(t, () => {
        let win, mkClient;
        beforeEach(() => {
          win = mkWindow();
          mkClient = (opts) => cmpClient(Object.assign({apiName: 'mockApiFn'}, opts), win)
        });

        it('should mark client function as direct', () => {
          expect(mkClient().isDirect).to.equal(true);
        });

        it('should find and call the CMP api function', () => {
          mkClient()({command: 'mockCmd'});
          sinon.assert.calledWith(mockApiFn, 'mockCmd');
        });

        describe('should return a promise that', () => {
          let cbResult;
          beforeEach(() => {
            cbResult = [];
            mockApiFn.callsFake((cmd, callback) => {
              if (typeof callback === 'function') {
                callback.apply(this, cbResult);
              }
              return 'val'
            })
          })

          Object.entries({
            callback: [sinon.stub(), 'undefined', undefined],
            'callback, mode = MODE_CALLBACK': [sinon.stub(), 'undefined', undefined, MODE_CALLBACK],
            'callback, mode = MODE_RETURN': [sinon.stub(), 'api return value', 'val', MODE_RETURN],
            'no callback': [undefined, 'api return value', 'val'],
            'no callback, mode = MODE_CALLBACK': [undefined, 'callback arg', 'cbVal', MODE_CALLBACK],
            'no callback, mode = MODE_RETURN': [undefined, 'api return value', 'val', MODE_RETURN],
          }).forEach(([t, [callback, tResult, expectedResult, mode]]) => {
            describe(`when ${t} is provided`, () => {
              Object.entries({
                'no success flag': undefined,
                'success is set': true
              }).forEach(([t, success]) => {
                it(`resolves to ${tResult} (${t})`, (done) => {
                  cbResult = ['cbVal', success];
                  mkClient({mode})({callback}).then((val) => {
                    expect(val).to.equal(expectedResult);
                    done();
                  })
                });

                it('should pass either a function or undefined as callback', () => {
                  mkClient({mode})({callback});
                  sinon.assert.calledWith(mockApiFn, sinon.match.any, sinon.match(arg => typeof arg === 'undefined' || typeof arg === 'function'))
                })
              });
            })
          });

          it('rejects to undefined when callback is provided and success = false', (done) => {
            cbResult = ['cbVal', false];
            mkClient()({callback: sinon.stub()}).catch(val => {
              expect(val).to.not.exist;
              done();
            })
          });

          it('rejects to callback arg when callback is NOT provided, success = false, mode = MODE_CALLBACK', (done) => {
            cbResult = ['cbVal', false];
            mkClient({mode: MODE_CALLBACK})().catch(val => {
              expect(val).to.eql('cbVal');
              done();
            })
          })

          it('rejects when CMP api throws', (done) => {
            mockApiFn.reset();
            const e = new Error();
            mockApiFn.throws(e);
            mkClient()({}).catch(val => {
              expect(val).to.equal(e);
              done();
            });
          });
        })

        it('should use apiArgs to choose and order the arguments to pass to the API fn', () => {
          mkClient({apiArgs: ['parameter', 'command']})({
            command: 'mockCmd',
            parameter: 'mockParam',
            callback() {}
          });
          sinon.assert.calledWith(mockApiFn, 'mockParam', 'mockCmd');
        });

        it('should not choke on .close()', () => {
          mkClient({}).close();
        })
      })
    })
  })

  describe('postMessage access', () => {
    let messenger, win, response;
    beforeEach(() => {
      response = {};
      messenger = sinon.stub().callsFake((msg) => {
        if (msg.mockApiCall) {
          win.postMessage({mockApiReturn: {callId: msg.mockApiCall.callId, ...response}});
        }
      });
    });

    function mkClient(options) {
      return cmpClient(Object.assign({apiName: 'mockApi'}, options), win);
    }

    Object.entries({
      'on same frame': () => {
        win = mockWindow({frames: {mockApiLocator: true}});
        win.addEventListener('message', (evt) => messenger(evt.data));
      },
      'on parent frame': () => {
        win = mockWindow({parent: mockWindow({frames: {mockApiLocator: true}})})
        win.parent.addEventListener('message', evt => messenger(evt.data))
      }
    }).forEach(([t, setup]) => {
      describe(t, () => {
        beforeEach(setup);

        it('should mark client as not direct', () => {
          expect(mkClient().isDirect).to.equal(false);
        });

        it('should find and message the CMP frame', () => {
          mkClient()({command: 'mockCmd', parameter: 'param'});
          sinon.assert.calledWithMatch(messenger, {
            mockApiCall: {
              command: 'mockCmd',
              parameter: 'param'
            }
          })
        });

        it('should use apiArgs to choose what to include in the message payload', () => {
          mkClient({apiArgs: ['command']})({
            command: 'cmd',
            parameter: 'param'
          });
          sinon.assert.calledWithMatch(messenger, sinon.match((arg) => {
            return arg.mockApiCall.command === 'cmd' &&
              !arg.mockApiCall.hasOwnProperty('parameter');
          }))
        });

        it('should not include callback in the payload, but still run it on response', () => {
          const cb = sinon.stub();
          mkClient({apiArgs: ['command', 'callback']})({
            command: 'cmd',
            callback: cb
          });
          sinon.assert.calledWithMatch(messenger, sinon.match(arg => !arg.mockApiCall.hasOwnProperty('callback')));
          sinon.assert.called(cb);
        });

        it('should use callbackArgs to decide what to pass to callback', () => {
          const cb = sinon.stub();
          response = {a: 'one', b: 'two'};
          mkClient({callbackArgs: ['a', 'b']})({callback: cb});
          sinon.assert.calledWith(cb, 'one', 'two');
        })

        describe('should return a promise that', () => {
          beforeEach(() => {
            response = {returnValue: 'val'}
          })
          Object.entries({
            'callback': [sinon.stub(), 'undefined', undefined],
            'callback, mode = MODE_RETURN': [sinon.stub(), 'undefined', undefined, MODE_RETURN],
            'callback, mode = MODE_CALLBACK': [sinon.stub(), 'undefined', undefined, MODE_CALLBACK],
            'no callback': [undefined, 'response returnValue', 'val'],
            'no callback, mode = MODE_RETURN': [undefined, 'undefined', undefined, MODE_RETURN],
            'no callback, mode = MODE_CALLBACK': [undefined, 'response returnValue', 'val', MODE_CALLBACK],
          }).forEach(([t, [callback, tResult, expectedResult, mode]]) => {
            describe(`when ${t} is provided`, () => {
              Object.entries({
                'no success flag': {},
                'with success flag': {success: true}
              }).forEach(([t, resp]) => {
                it(`resolves to ${tResult} (${t})`, () => {
                  Object.assign(response, resp);
                  mkClient({mode})({callback}).then((val) => {
                    expect(val).to.equal(expectedResult);
                  })
                })
              });

              if (mode !== MODE_RETURN) { // in return mode, the promise never rejects
                it(`rejects to ${tResult} when success = false`, (done) => {
                  response.success = false;
                  mkClient()({mode, callback}).catch((err) => {
                    expect(err).to.equal(expectedResult);
                    done();
                  });
                });
              }
            })
          });
        });

        describe('messages with same callID', () => {
          let callback, callId;

          function runCallback(returnValue) {
            win.postMessage({mockApiReturn: {callId, returnValue}});
          }

          beforeEach(() => {
            callId = null;
            messenger.reset();
            messenger.callsFake((msg) => {
              if (msg.mockApiCall) callId = msg.mockApiCall.callId;
            });
            callback = sinon.stub();
          });

          it('should re-use callback for messages with same callId', () => {
            mkClient()({callback});
            expect(callId).to.exist;
            runCallback('a');
            runCallback('b');
            sinon.assert.calledWith(callback, 'a');
            sinon.assert.calledWith(callback, 'b');
          });

          it('should NOT re-use callback if once = true', () => {
            mkClient()({callback}, true);
            expect(callId).to.exist;
            runCallback('a');
            runCallback('b');
            sinon.assert.calledWith(callback, 'a');
            sinon.assert.calledOnce(callback);
          });

          it('should NOT fire again after .close()', () => {
            const client = mkClient();
            client({callback});
            runCallback('a');
            client.close();
            runCallback('b');
            sinon.assert.calledWith(callback, 'a');
            sinon.assert.calledOnce(callback);
          })
        });
      });
    });
  });
});
