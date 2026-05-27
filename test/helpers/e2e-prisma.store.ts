import { createE2eSeed, type E2eStore } from '../fixtures/e2e-seed';

let store: E2eStore = createE2eSeed();

export function getE2eStore(): E2eStore {
  return store;
}

export function resetE2eStore(): void {
  store = createE2eSeed();
}
