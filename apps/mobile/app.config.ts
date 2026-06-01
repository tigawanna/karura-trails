import { ConfigContext, ExpoConfig } from "expo/config";

import brand from "./brand.json";

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
    "expo-router",
    "expo-font",
    "expo-status-bar",
    "expo-web-browser",
    "@maplibre/maplibre-react-native",
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
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 120,
        resizeMode: "contain",
        backgroundColor: BrandColors.darkForestGreen,
        dark: {
          image: "./assets/images/splash-icon.png",
          backgroundColor: BrandColors.deepForestGreen,
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

  return plugins;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const { name, slug } = getAppName();
  const bundleIdentifier = getUniqueIdentifier();
  const plugins = getPlugins(bundleIdentifier);

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
        backgroundColor: BrandColors.darkForestGreen,
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
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
    extra: {
      router: {},
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
  };
};

function isProductionBundle(bundleId: string): boolean {
  return bundleId === PRODUCTION_BUNDLE_ID;
}
