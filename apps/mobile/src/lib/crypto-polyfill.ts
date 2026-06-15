import * as Crypto from "expo-crypto";

function installCryptoPolyfill(): void {
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    return;
  }

  const cryptoShim = {
    getRandomValues<T extends ArrayBufferView>(array: T): T {
      const bytes = Crypto.getRandomBytes(array.byteLength);
      const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      view.set(bytes);
      return array;
    },
    randomUUID: () => Crypto.randomUUID(),
  };

  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: cryptoShim,
  });
}

installCryptoPolyfill();
