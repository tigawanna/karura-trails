import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { headingToScreenRotation } from "@/geo/heading";

export const USER_LOCATION_ARROW_COLOR = "#fb0404";
export const USER_LOCATION_ARROW_VIEWBOX = "0 0 287.863 287.863";

export const USER_LOCATION_ARROW_PATH =
  "M11.851,282.734c2.448,6.732,12.852,6.732,14.688,0.612l0,0c13.464,4.896,41.004-27.54,49.572-34.884 c15.3-12.853,30.6-25.092,47.124-36.108c15.912-10.403,22.032-12.239,37.332-0.611c26.929,21.42,50.796,47.124,80.784,64.26 c6.732,3.672,40.393,13.464,33.66-5.508c0,0,0,0,0-0.612c2.448-1.224,3.672-3.672,2.448-7.344 C235.23,176.858,197.287,88.118,150.163,4.274c-2.448-4.284-9.792-6.12-12.853-1.836C98.143,52.01,82.843,113.21,54.691,168.902 C40.003,197.667,0.835,248.463,11.851,282.734z M162.402,172.575c0.612-0.612,0.612-0.612,1.225-1.225l0,0 c0.612,0.612,1.224,1.225,1.836,1.836c1.224,1.836,1.836,3.061,3.06,4.896c-1.836-1.225-3.06-2.448-4.896-3.672 C163.015,173.187,163.015,172.575,162.402,172.575z";

interface UserLocationArrowIconProps {
  size?: number;
  heading?: number | null;
  mapBearing?: number;
}

export function UserLocationArrowIcon({
  size = 44,
  heading = null,
  mapBearing = 0,
}: UserLocationArrowIconProps) {
  const rotation = headingToScreenRotation(heading, mapBearing) ?? 0;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]} testID="user-location-arrow-icon">
      <View
        collapsable={false}
        style={[
          styles.rotator,
          {
            width: size,
            height: size,
            transform: [{ rotate: `${rotation}deg` }],
            transformOrigin: "50% 100%",
          },
        ]}
      >
        <View
          style={[
            styles.pulse,
            {
              width: size * 1.35,
              height: size * 1.35,
              borderRadius: size * 0.675,
              backgroundColor: USER_LOCATION_ARROW_COLOR,
            },
          ]}
        />
        <Svg width={size} height={size} viewBox={USER_LOCATION_ARROW_VIEWBOX}>
          <Path d={USER_LOCATION_ARROW_PATH} fill={USER_LOCATION_ARROW_COLOR} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  rotator: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    opacity: 0.14,
  },
});
