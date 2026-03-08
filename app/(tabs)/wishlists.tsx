import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ListingCard } from "@/components/ListingCard";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, setAuthToken } from "@/lib/query-client";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function WishlistsScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data: wishlistItems = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/wishlists"],
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const res = await apiRequest("POST", `/api/wishlists/${listingId}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/wishlists"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Wishlists</Text>
        </View>
        <View style={styles.guestState}>
          <Ionicons name="heart-outline" size={60} color={Colors.border} />
          <Text style={styles.guestTitle}>Log in to view wishlists</Text>
          <Text style={styles.guestText}>
            Save your favorite places to revisit them anytime.
          </Text>
          <Pressable style={styles.loginButton} onPress={() => router.push("/auth/login")}>
            <Text style={styles.loginButtonText}>Log in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wishlists</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : wishlistItems.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="heart-outline" size={60} color={Colors.border} />
          <Text style={styles.emptyTitle}>No saved listings yet</Text>
          <Text style={styles.emptyText}>
            Tap the heart on any listing to save it here.
          </Text>
          <Pressable style={styles.exploreButton} onPress={() => router.push("/(tabs)")}>
            <Text style={styles.exploreButtonText}>Start exploring</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={wishlistItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard
              listing={item.listing}
              isWishlisted={true}
              onWishlistToggle={(id) => toggleMutation.mutate(id)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: Platform.OS === "web" ? 100 : 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  guestState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  guestTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    color: Colors.text,
    textAlign: "center",
  },
  guestText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: Colors.text,
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  loginButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.white,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.text,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  exploreButton: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: Colors.text,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  exploreButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
});
