import type { ConfigContext, ExpoConfig } from "expo/config";

import brand from "./brand.json" with { type: "json" };

const BrandColors = brand;

const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

const PRODUCTION_BUNDLE_ID = "com.tigawanna.karuratrails";

const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return `${PRODUCTION_BUNDLE_ID}.dev`;
  }

  if (IS_PREVIEW) {
    return `${PRODUCTION_BUNDLE_ID}.preview`;
  }

  return PRODUCTION_BUNDLE_ID;
};

type UniqueIdentifier = ReturnType<typeof getUniqueIdentifier>;

const getAppName = () => {
  if (IS_DEV) {
    return { name: "Karura Trails (Dev)", slug: "karura-trails" };
  }

  if (IS_PREVIEW) {
    return { name: "Karura Trails (Preview)", slug: "karura-trails" };
  }

  return { name: "Karura Trails", slug: "karura-trails" };
};

const getPlugins = (bundleId: UniqueIdentifier) => {
  const isProduction = bundleId === PRODUCTION_BUNDLE_ID;

  const plugins: NonNullable<ExpoConfig["plugins"]> = [
    "@react-native-vector-icons/material-design-icons",
    "expo-router",
    "expo-asset",
    "expo-image",
    "expo-font",
    "expo-status-bar",
    "expo-web-browser",
    "@maplibre/maplibre-react-native",
    "./plugins/opsqlite-spatialite/with-spatialite",
    "./plugins/with-android-gradle",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow Karura Trails to use your location to show where you are on the map.",
        locationWhenInUsePermission:
          "Allow Karura Trails to use your location to show where you are on the map.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Allow Karura Trails to save photos you take of forest markers.",
        cameraPermission: "Allow Karura Trails to use the camera when recording marker photos.",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 642,
        resizeMode: "contain",
        backgroundColor: BrandColors.splashBackground,
        dark: {
          image: "./assets/images/splash-icon.png",
          backgroundColor: BrandColors.splashBackground,
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          usesCleartextTraffic: !isProduction,
        },
        ios: {
          flipper: true,
        },
      },
    ],
  ];

  if (bundleId === PRODUCTION_BUNDLE_ID || bundleId === `${PRODUCTION_BUNDLE_ID}.preview`) {
    plugins.push("@react-native-firebase/app");
    plugins.push("@react-native-firebase/crashlytics");
  }

  return plugins;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const { name, slug } = getAppName();
  const bundleIdentifier = getUniqueIdentifier();
  const plugins = getPlugins(bundleIdentifier);
  const isNotDev =
    bundleIdentifier === PRODUCTION_BUNDLE_ID ||
    bundleIdentifier === `${PRODUCTION_BUNDLE_ID}.preview`;

  return {
    ...config,
    name,
    slug,
    scheme: "karura-trails",
    version: "0.0.1",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "automatic",
    ios: {
      ...config.ios,
      supportsTablet: true,
      icon: "./assets/expo.icon",
      bundleIdentifier,
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: !isProductionBundle(bundleIdentifier),
        },
      },
    },
    android: {
      ...config.android,
      adaptiveIcon: {
        backgroundColor: BrandColors.splashBackground,
        foregroundImage: "./assets/images/adaptive-icon.png",
      },
      googleServicesFile: isNotDev ? "./google-services.json" : undefined,
      predictiveBackGestureEnabled: false,
      package: bundleIdentifier,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins,
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/b57a6ef2-0ad6-4a59-a8bb-2ba46308d5fb",
    },
    extra: {
      router: {},
      eas: {
        projectId: "b57a6ef2-0ad6-4a59-a8bb-2ba46308d5fb",
      },
    },
  };
};

function isProductionBundle(bundleId: string): boolean {
  return bundleId === PRODUCTION_BUNDLE_ID;
}
