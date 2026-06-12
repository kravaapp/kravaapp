import { StyleSheet, Text, View } from "react-native";

interface KravaLogoProps {
  size?: number;
  showWordmark?: boolean;
}

const KravaLogo = ({
  size = 36,
  showWordmark = false,
}: KravaLogoProps) => {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.logo,
          {
            width: size,
            height: size,
            borderRadius: size * 0.2,
          },
        ]}
      >
        <Text
          style={[
            styles.logoText,
            {
              fontSize: size * 0.6,
            },
          ]}
        >
          K
        </Text>
      </View>

      {showWordmark && (
        <Text style={styles.wordmark}>
          krava
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },

  logo: {
    backgroundColor: "#E85C07",
    justifyContent: "center",
    alignItems: "center",
  },

  logoText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    lineHeight: undefined,
  },

  wordmark: {
    marginLeft: 8,
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    letterSpacing: -0.5,
  },
});

export default KravaLogo;