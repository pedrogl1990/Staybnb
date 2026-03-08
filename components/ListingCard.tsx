import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import Colors from "@/constants/colors";

interface Listing {
  id: string;
  title: string;
  location: string;
  city: string;
  country: string;
  price_per_night: number;
  photos: string[];
  category: string;
  bedrooms: number;
  max_guests: number;
  host?: {
    name: string;
    avatar_url: string | null;
  };
}

interface ListingCardProps {
  listing: Listing;
  isWishlisted?: boolean;
  onWishlistToggle?: (id: string) => void;
  style?: object;
}

const CARD_WIDTH = Dimensions.get("window").width - 32;

export function ListingCard({ listing, isWishlisted = false, onWishlistToggle, style }: ListingCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const photo = listing.photos?.[0] || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80";
  const priceInDollars = (listing.price_per_night / 100).toFixed(0);

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => router.push({ pathname: "/listing/[id]", params: { id: listing.id } })}
        style={styles.card}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: photo }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />
          {onWishlistToggle && (
            <Pressable
              onPress={() => onWishlistToggle(listing.id)}
              style={styles.heartButton}
              hitSlop={12}
            >
              <Ionicons
                name={isWishlisted ? "heart" : "heart-outline"}
                size={22}
                color={isWishlisted ? Colors.primary : Colors.white}
              />
            </Pressable>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {listing.city}, {listing.country}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={Colors.star} />
              <Text style={styles.rating}>4.9</Text>
            </View>
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>{listing.title}</Text>
          <Text style={styles.beds}>{listing.bedrooms} bed{listing.bedrooms !== 1 ? "s" : ""} · up to {listing.max_guests} guests</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>${priceInDollars}</Text>
            <Text style={styles.perNight}> / night</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 240,
    borderRadius: 16,
  },
  heartButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    paddingTop: 10,
    gap: 3,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  rating: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  beds: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  price: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  perNight: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
