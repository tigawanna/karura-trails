import { v7 as uuidv7 } from "uuid";

export function createSyncEventId(): string {
  return uuidv7();
}
