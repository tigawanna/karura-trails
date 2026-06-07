const { withGradleProperties } = require("expo/config-plugins");

module.exports = (config) => {
  return withGradleProperties(config, (config) => {
    const properties = config.modResults;

    const upsertProperty = (key, value) => {
      const existing = properties.find((entry) => entry.type === "property" && entry.key === key);

      if (existing) {
        existing.value = value;
        return;
      }

      properties.push({ type: "property", key, value });
    };

    upsertProperty("android.lint.checkReleaseBuilds", "false");
    upsertProperty(
      "org.gradle.jvmargs",
      "-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError",
    );

    return config;
  });
};
