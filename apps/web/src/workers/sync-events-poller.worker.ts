type PollerStartMessage = {
  type: "start";
  cursor: string | null;
  intervalMs: number;
};

type PollerStopMessage = {
  type: "stop";
};

type PollerPollNowMessage = {
  type: "poll-now";
};

type PollerIncomingMessage = PollerStartMessage | PollerStopMessage | PollerPollNowMessage;

type SyncPullResponse = {
  events: unknown[];
  hasMore: boolean;
  nextCursor: string | null;
};

let cursor: string | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let polling = false;

async function pollAllPending() {
  if (polling) {
    return;
  }
  polling = true;
  try {
    const collected: unknown[] = [];
    let hasMore = true;
    let latestCursor: string | null = cursor;

    while (hasMore) {
      const params = new URLSearchParams({ limit: "100" });
      if (latestCursor) {
        params.set("after", latestCursor);
      }
      const response = await fetch(`/api/sync/events?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        self.postMessage({
          type: "error",
          message: `Sync pull failed (${response.status})`,
        });
        return;
      }
      const body = (await response.json()) as SyncPullResponse;
      if (body.events.length > 0) {
        collected.push(...body.events);
      }
      if (body.nextCursor) {
        latestCursor = body.nextCursor;
      }
      hasMore = body.hasMore;
    }

    if (collected.length > 0) {
      cursor = latestCursor;
      self.postMessage({
        type: "events",
        events: collected,
        nextCursor: latestCursor,
      });
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Sync pull failed",
    });
  } finally {
    polling = false;
  }
}

function start(intervalMs: number) {
  if (timer) {
    clearInterval(timer);
  }
  timer = setInterval(() => {
    void pollAllPending();
  }, intervalMs);
  void pollAllPending();
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

self.onmessage = (event: MessageEvent<PollerIncomingMessage>) => {
  const message = event.data;
  if (message.type === "start") {
    cursor = message.cursor;
    start(message.intervalMs);
    return;
  }
  if (message.type === "stop") {
    stop();
    return;
  }
  if (message.type === "poll-now") {
    void pollAllPending();
  }
};
