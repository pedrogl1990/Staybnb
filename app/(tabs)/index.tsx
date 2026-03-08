import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ListingCard } from "@/components/ListingCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, setAuthToken } from "@/lib/query-client";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Keep global auth token in sync
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const { data: listings = [], isLoading, refetch, isRefetching } = useQuery<any[]>({
    queryKey: ["/api/listings", category, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category && category !== "all") params.set("category", category);
      if (search) params.set("city", search);
      const { getApiUrl } = await import("@/lib/query-client");
      const url = new URL(`/api/listings?${params}`, getApiUrl());
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(url.toString(), { headers });
      return res.json();
    },
  });

  const { data: wishlists = [] } = useQuery<any[]>({
    queryKey: ["/api/wishlists"],
    enabled: !!user,
  });

  const wishlistedIds = new Set((wishlists as any[]).map((w: any) => w.listing_id));

  const toggleWishlistMutation = useMutation({
    mutationFn: async (listingId: string) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const res = await apiRequest("POST", `/api/wishlists/${listingId}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/wishlists"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const handleSearch = () => {
    setSearch(searchInput.trim());
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.logo}>stayfinder</Text>

        {/* Search Bar */}
        <Pressable style={styles.searchBar} onPress={() => {}}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where to?"
            placeholderTextColor={Colors.textLight}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <Pressable onPress={() => { setSearchInput(""); setSearch(""); }}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </Pressable>
          )}
        </Pressable>

        {/* Host CTA */}
        {user?.role === "host" && (
          <Pressable style={styles.hostButton} onPress={() => router.push("/listing/create")}>
            <Ionicons name="add" size={18} color={Colors.white} />
            <Text style={styles.hostButtonText}>Add listing</Text>
          </Pressable>
        )}
      </View>

      {/* Category Filter */}
      <View style={styles.categoryWrapper}>
        <CategoryFilter selected={category} onSelect={setCategory} />
      </View>

      {/* Listings */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="home-outline" size={56} color={Colors.border} />
          <Text style={styles.emptyTitle}>No listings found</Text>
          <Text style={styles.emptyText}>Try a different location or category</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              isWishlisted={wishlistedIds.has(item.id)}
              onWishlistToggle={(id) => toggleWishlistMutation.mutate(id)}
            />
          )}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
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
    paddingBottom: 8,
    backgroundColor: Colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },
  logo: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
  },
  hostButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.primary,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  hostButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.white,
  },
  categoryWrapper: {
    backgroundColor: Colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
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
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.text,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
