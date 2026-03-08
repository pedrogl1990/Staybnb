import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { setAuthToken } from "@/lib/query-client";
import Colors from "@/constants/colors";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// The Inbox shows host booking requests when user is a host
// For guests, it shows notifications about their booking status
export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data: hostBookings = [] } = useQuery<any[]>({
    queryKey: ["/api/bookings/host"],
    enabled: !!user && user.role === "host",
  });

  const { data: guestBookings = [] } = useQuery<any[]>({
    queryKey: ["/api/bookings/mine"],
    enabled: !!user && user.role === "guest",
  });

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Inbox</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="chatbubble-outline" size={60} color={Colors.border} />
          <Text style={styles.emptyTitle}>Log in to see messages</Text>
          <Text style={styles.emptyText}>Booking confirmations and updates appear here.</Text>
          <Pressable style={styles.loginButton} onPress={() => router.push("/auth/login")}>
            <Text style={styles.loginButtonText}>Log in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const bookings = user.role === "host" ? (hostBookings as any[]) : (guestBookings as any[]);
  const notifications = bookings.map((b: any) => ({
    id: b.id,
    title: user.role === "host"
      ? `New booking request for ${b.listing?.title}`
      : `Your booking at ${b.listing?.title}`,
    subtitle: `${formatDate(b.check_in)} — ${formatDate(b.check_out)} · ${b.guests_count} guest${b.guests_count !== 1 ? "s" : ""}`,
    status: b.status,
    photo: b.listing?.photos?.[0],
    listingId: b.listing_id,
    created_at: b.created_at,
  }));

  const statusIcons: Record<string, any> = {
    pending: { icon: "time-outline", color: Colors.warning },
    confirmed: { icon: "checkmark-circle", color: Colors.success },
    cancelled: { icon: "close-circle", color: Colors.error },
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inbox</Text>
        {user.role === "host" && (
          <Text style={styles.headerSubtitle}>
            Manage bookings for your listings
          </Text>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubble-outline" size={60} color={Colors.border} />
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyText}>
            {user.role === "host"
              ? "Booking requests for your listings will appear here."
              : "Updates about your trips will appear here."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const statusInfo = statusIcons[item.status] || statusIcons.pending;
            return (
              <Pressable
                style={styles.notifCard}
                onPress={() => router.push({ pathname: "/listing/[id]", params: { id: item.listingId } })}
              >
                {item.photo ? (
                  <Image source={{ uri: item.photo }} style={styles.notifImage} contentFit="cover" />
                ) : (
                  <View style={[styles.notifImage, styles.notifImagePlaceholder]}>
                    <Ionicons name="home-outline" size={24} color={Colors.border} />
                  </View>
                )}
                <View style={styles.notifContent}>
                  <Text style={styles.notifTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.notifSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                  <View style={styles.notifStatus}>
                    <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                    <Text style={[styles.notifStatusText, { color: statusInfo.color }]}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    gap: 4,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  listContent: {
    paddingBottom: Platform.OS === "web" ? 100 : 32,
  },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  notifImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  notifImagePlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: {
    flex: 1,
    gap: 3,
  },
  notifTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  notifSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  notifStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  notifStatusText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  separator: {
    height: 0.5,
    backgroundColor: Colors.borderLight,
    marginLeft: 84,
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
});
