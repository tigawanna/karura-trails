import * as FileSystem from "expo-file-system/legacy";

const MARKER_PHOTOS_DIR = "marker-photos";

export async function ensureMarkerPhotosDirectory(): Promise<string> {
  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error("App document storage is unavailable");
  }

  const directory = `${baseDir}${MARKER_PHOTOS_DIR}`;
  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }

  return directory;
}

export async function persistMarkerPhoto(sourceUri: string): Promise<string> {
  const directory = await ensureMarkerPhotosDirectory();
  const extension = sourceUri.split(".").pop()?.split("?")[0] ?? "jpg";
  const destination = `${directory}/marker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
}
