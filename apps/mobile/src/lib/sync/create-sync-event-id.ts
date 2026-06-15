import "@/lib/crypto-polyfill";
import { v7 as uuidv7 } from "uuid";

export function createSyncEventId(): string {
  return uuidv7();
}
