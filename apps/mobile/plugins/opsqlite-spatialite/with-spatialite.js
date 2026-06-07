const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

const ARCHITECTURES = ["arm64-v8a", "armeabi-v7a", "x86", "x86_64"];

module.exports = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const pluginDir = path.dirname(module.filename);
      const sourceBase = path.join(pluginDir, "spatialite-libs", "jni");
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      const targetBase = path.join(platformProjectRoot, "app", "src", "main", "jniLibs");

      if (!fs.existsSync(sourceBase)) {
        throw new Error(
          `SpatiaLite libraries not found at ${sourceBase}\n` +
            "Run pnpm fetch:spatialite before prebuild (see spatialite.release.json).",
        );
      }

      for (const arch of ARCHITECTURES) {
        const sourceDir = path.join(sourceBase, arch);
        const targetDir = path.join(targetBase, arch);

        if (!fs.existsSync(sourceDir)) {
          throw new Error(
            `Missing SpatiaLite ABI folder: ${sourceDir}\n` +
              "Run pnpm fetch:spatialite to download release artifacts.",
          );
        }

        fs.mkdirSync(targetDir, { recursive: true });

        for (const file of fs.readdirSync(sourceDir)) {
          if (!file.endsWith(".so")) {
            continue;
          }
          fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
        }
      }

      return config;
    },
  ]);
};
