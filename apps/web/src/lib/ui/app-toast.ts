import { toast as sonnerToast, type ExternalToast } from "sonner";

const PREFIX = "[toast]";

function logToast(level: "log" | "error", kind: string, message: unknown, options?: ExternalToast) {
  if (options !== undefined) {
    console[level](PREFIX, kind, message, options);
    return;
  }
  console[level](PREFIX, kind, message);
}

type ToastFn = typeof sonnerToast;

const toast = ((message: Parameters<ToastFn>[0], options?: ExternalToast) => {
  logToast("log", "default", message, options);
  return sonnerToast(message, options);
}) as ToastFn;

toast.success = (message, options) => {
  logToast("log", "success", message, options);
  return sonnerToast.success(message, options);
};

toast.error = (message, options) => {
  logToast("error", "error", message, options);
  return sonnerToast.error(message, options);
};

toast.message = (message, options) => {
  logToast("log", "message", message, options);
  return sonnerToast.message(message, options);
};

toast.loading = (message, options) => sonnerToast.loading(message, options);
toast.dismiss = (id) => sonnerToast.dismiss(id);
toast.promise = sonnerToast.promise.bind(sonnerToast);
toast.custom = sonnerToast.custom.bind(sonnerToast);
toast.info = (message, options) => {
  logToast("log", "info", message, options);
  return sonnerToast.info(message, options);
};
toast.warning = (message, options) => {
  logToast("log", "warning", message, options);
  return sonnerToast.warning(message, options);
};

export { toast };
