export type CapturedErrorContext = {
  source: string;
  phase?: string;
  extra?: Record<string, unknown>;
};

type ErrorDetail = {
  kind: "Error" | "unknown";
  name?: string;
  message: string;
  stack?: string | null;
  cause?: ErrorDetail;
};

function errorToDetail(err: unknown, depth = 0): ErrorDetail {
  if (err instanceof Error) {
    const detail: ErrorDetail = {
      kind: "Error",
      name: err.name,
      message: err.message,
      stack: err.stack ?? null,
    };

    if (err.cause !== undefined && depth < 4) {
      detail.cause = errorToDetail(err.cause, depth + 1);
    }

    return detail;
  }

  if (typeof err === "string") {
    return { kind: "unknown", message: err };
  }

  if (err === null || err === undefined) {
    return { kind: "unknown", message: String(err) };
  }

  try {
    return {
      kind: "unknown",
      message: JSON.stringify(err),
    };
  } catch {
    return { kind: "unknown", message: String(err) };
  }
}

function captureSiteStack(): string | null {
  const stack = new Error("capture site").stack;
  if (!stack) {
    return null;
  }

  const lines = stack.split("\n").slice(2);
  return lines.join("\n").trim() || null;
}

export function logCapturedError(
  scope: string,
  err: unknown,
  context?: CapturedErrorContext,
): void {
  try {
    const headline = context?.phase
      ? `[${scope}] ${context.phase} failed`
      : `[${scope}] captured error`;

    const payload = {
      scope,
      source: context?.source ?? "unknown",
      phase: context?.phase ?? null,
      capturedAt: captureSiteStack(),
      ...context?.extra,
      error: errorToDetail(err),
    };

    console.error(headline);
    console.error(JSON.stringify(payload, null, 2));

    if (err instanceof Error && err.stack) {
      console.error(`[${scope}] original stack:\n${err.stack}`);
    } else {
      console.error(`[${scope}] original error:`, err);
    }
  } catch (logErr: unknown) {
    console.error(`[${scope}] failed to format error log`, logErr);
    console.error(`[${scope}] raw error:`, err);
  }
}

export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
