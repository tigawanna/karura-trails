import { Alert, type AlertButton } from "react-native";

const PREFIX = "[alert]";

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  console.log(PREFIX, title, message ?? "", buttons ?? []);
  Alert.alert(title, message, buttons);
}

export function showErrorAlert(title: string, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  console.error(PREFIX, title, message, error);
  Alert.alert(title, message);
}
