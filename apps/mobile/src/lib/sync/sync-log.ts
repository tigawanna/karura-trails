const PREFIX = "[sync]";

export function syncLog(message: string, details?: Record<string, unknown>): void {
  if (!__DEV__) {
    return;
  }
  if (details) {
    console.log(PREFIX, message, details);
    return;
  }
  console.log(PREFIX, message);
}

export function syncWarn(message: string, details?: Record<string, unknown>): void {
  if (!__DEV__) {
    return;
  }
  if (details) {
    console.warn(PREFIX, message, details);
    return;
  }
  console.warn(PREFIX, message);
}
