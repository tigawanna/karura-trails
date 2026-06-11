import crashlytics from "@react-native-firebase/crashlytics";

export function logError(error: Error, context?: string) {
  if (context) {
    crashlytics().log(`Error in ${context}`);
  }
  crashlytics().recordError(error);
}

export function setUserId(userId: string) {
  crashlytics().setUserId(userId);
}

export function setAttribute(key: string, value: string) {
  crashlytics().setAttribute(key, value);
}

export function log(message: string) {
  crashlytics().log(message);
}

export function testCrash() {
  if (__DEV__) {
    crashlytics().log("Testing crash from development");
    crashlytics().crash();
  }
}
