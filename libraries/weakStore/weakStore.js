import {auctionManager} from '../../src/auctionManager.js';

export function weakStore(get) {
  const store = new WeakMap();
  return function (id, init = {}) {
    const obj = get(id);
    if (obj == null) return;
    if (!store.has(obj)) {
      store.set(obj, init);
    }
    return store.get(obj);
  };
}

export const auctionStore = () => weakStore((auctionId) => auctionManager.index.getAuction({auctionId}));
