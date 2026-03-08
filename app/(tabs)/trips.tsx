import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, setAuthToken } from "@/lib/query-client";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

type TripStatus = "upcoming" | "past" | "cancelled";

function getStatus(booking: any): TripStatus {
  if (booking.status === "cancelled") return "cancelled";
  const today = new Date().toISOString().split("T")[0];
  if (booking.check_out < today) return "past";
  return "upcoming";
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function TripCard({ booking, onCancel }: { booking: any; onCancel?: () => void }) {
  const status = getStatus(booking);
  const nights = Math.ceil(
    (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const photo = booking.listing?.photos?.[0];
  const price = ((booking.total_price || 0) / 100).toFixed(0);

  const statusColors = {
    upcoming: Colors.success,
    past: Colors.textSecondary,
    cancelled: Colors.error,
  };
  const statusLabels = {
    upcoming: "Upcoming",
    past: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <Pressable
      style={styles.tripCard}
      onPress={() => router.push({ pathname: "/listing/[id]", params: { id: booking.listing_id } })}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={styles.tripImage} contentFit="cover" />
      ) : (
        <View style={[styles.tripImage, styles.tripImagePlaceholder]}>
          <Ionicons name="home-outline" size={32} color={Colors.border} />
        </View>
      )}
      <View style={styles.tripInfo}>
        <View style={styles.tripTitleRow}>
          <Text style={styles.tripTitle} numberOfLines={1}>
            {booking.listing?.title || "Listing"}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[status] + "20" }]}>
            <Text style={[styles.statusText, { color: statusColors[status] }]}>
              {statusLabels[status]}
            </Text>
          </View>
        </View>
        <Text style={styles.tripLocation}>{booking.listing?.city}</Text>
        <Text style={styles.tripDates}>
          {formatDate(booking.check_in)} — {formatDate(booking.check_out)}
        </Text>
        <View style={styles.tripFooter}>
          <Text style={styles.tripNights}>{nights} night{nights !== 1 ? "s" : ""}</Text>
          <Text style={styles.tripPrice}>${price} total</Text>
        </View>
        {status === "upcoming" && onCancel && (
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel reservation</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data: bookings = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/bookings/mine"],
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PUT", `/api/bookings/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bookings/mine"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const confirmCancel = (id: string) => {
    Alert.alert(
      "Cancel reservation",
      "Are you sure you want to cancel this reservation?",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel reservation",
          style: "destructive",
          onPress: () => cancelMutation.mutate(id),
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trips</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="briefcase-outline" size={60} color={Colors.border} />
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptyText}>Log in to view your bookings.</Text>
          <Pressable style={styles.loginButton} onPress={() => router.push("/auth/login")}>
            <Text style={styles.loginButtonText}>Log in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const upcoming = (bookings as any[]).filter((b) => getStatus(b) === "upcoming");
  const past = (bookings as any[]).filter((b) => getStatus(b) !== "upcoming");
  const displayed = tab === "upcoming" ? upcoming : past;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trips</Text>
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, tab === "upcoming" && styles.tabActive]}
            onPress={() => setTab("upcoming")}
          >
            <Text style={[styles.tabText, tab === "upcoming" && styles.tabTextActive]}>
              Upcoming ({upcoming.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === "past" && styles.tabActive]}
            onPress={() => setTab("past")}
          >
            <Text style={[styles.tabText, tab === "past" && styles.tabTextActive]}>
              Past ({past.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name={tab === "upcoming" ? "calendar-outline" : "time-outline"}
            size={60}
            color={Colors.border}
          />
          <Text style={styles.emptyTitle}>
            No {tab === "upcoming" ? "upcoming" : "past"} trips
          </Text>
          <Text style={styles.emptyText}>
            {tab === "upcoming"
              ? "Start planning your next adventure."
              : "Your completed trips will appear here."}
          </Text>
          {tab === "upcoming" && (
            <Pressable style={styles.exploreButton} onPress={() => router.push("/(tabs)")}>
              <Text style={styles.exploreButtonText}>Explore listings</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TripCard
              booking={item}
              onCancel={getStatus(item) === "upcoming" ? () => confirmCancel(item.id) : undefined}
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
    paddingBottom: 0,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
  },
  tabRow: {
    flexDirection: "row",
    gap: 0,
  },
  tab: {
    paddingHorizontal: 4,
    paddingVertical: 12,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: Colors.text,
  },
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  listContent: {
    padding: 16,
    gap: 16,
    paddingBottom: Platform.OS === "web" ? 100 : 32,
  },
  tripCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tripImage: {
    width: "100%",
    height: 180,
  },
  tripImagePlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  tripInfo: {
    padding: 16,
    gap: 6,
  },
  tripTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  tripTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  tripLocation: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tripDates: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.text,
  },
  tripFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  tripNights: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tripPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.text,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  cancelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.error,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
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
