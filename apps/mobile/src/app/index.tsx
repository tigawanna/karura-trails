import { trailsQueryOptions } from "@/data-access-layer/trails";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";


export default function HomeScreen() {
  const { colors } = useTheme();
  const { data: trails, isLoading: trailsLoading } = useQuery(trailsQueryOptions);
  
  if(trailsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if(!trails || trails.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text>No trails found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* <KaruraMap />
       */}
      <Text>Hello World</Text>
      <Text>{trails.length}</Text>
      {trails.map((trail) => (
        <View key={trail.id}>
          <Text>{trail.name}</Text>
          <Text>{trail.description}</Text>
          <Text>{trail.difficulty}</Text>
          <Text>{trail.distanceMeters}</Text>
          <Text>{trail.elevationGain}</Text>
          <Text>{trail.elevationLoss}</Text>
          <Text>{trail.minElevation}</Text>
          <Text>{trail.maxElevation}</Text>
        </View>
      ))}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: "100%",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
