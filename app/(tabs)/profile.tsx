import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Alert,
  Switch,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { setAuthToken } from "@/lib/query-client";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

function SettingRow({
  icon,
  label,
  onPress,
  rightElement,
  danger,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.settingRow, pressed && styles.settingRowPressed]}
      onPress={onPress}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={20} color={danger ? Colors.error : Colors.text} />
        <Text style={[styles.settingLabel, danger && { color: Colors.error }]}>{label}</Text>
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, logout } = useAuth();
  const colorScheme = useColorScheme();

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: bookings = [] } = useQuery<any[]>({
    queryKey: ["/api/bookings/mine"],
    enabled: !!user,
  });

  const { data: wishlists = [] } = useQuery<any[]>({
    queryKey: ["/api/wishlists"],
    enabled: !!user,
  });

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.center}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={48} color={Colors.textLight} />
          </View>
          <Text style={styles.guestTitle}>Log in to StayFinder</Text>
          <Text style={styles.guestText}>
            Save trips, wishlists, and manage your bookings.
          </Text>
          <Pressable style={styles.loginButton} onPress={() => router.push("/auth/login")}>
            <Text style={styles.loginButtonText}>Log in</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/auth/register")}>
            <Text style={styles.signupLink}>
              Don't have an account? <Text style={styles.signupLinkBold}>Sign up</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const initials = user.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding, paddingBottom: bottomPadding + 24 }]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* User Card */}
      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons
              name={user.role === "host" ? "home" : "person"}
              size={12}
              color={Colors.primary}
            />
            <Text style={styles.roleText}>
              {user.role === "host" ? "Host" : "Guest"}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{(bookings as any[]).length}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{(wishlists as any[]).length}</Text>
          <Text style={styles.statLabel}>Wishlists</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {user.role === "host" ? "Host" : "Guest"}
          </Text>
          <Text style={styles.statLabel}>Account type</Text>
        </View>
      </View>

      {/* Host Section */}
      {user.role === "host" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hosting</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="home-outline"
              label="My listings"
              onPress={() => {}}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="add-circle-outline"
              label="Create a listing"
              onPress={() => router.push("/listing/create")}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="calendar-outline"
              label="Booking requests"
              onPress={() => router.push("/(tabs)/inbox")}
            />
          </View>
        </View>
      )}

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.sectionCard}>
          <SettingRow icon="person-outline" label="Edit profile" onPress={() => {}} />
          <View style={styles.rowDivider} />
          <SettingRow icon="notifications-outline" label="Notifications" onPress={() => {}} />
          <View style={styles.rowDivider} />
          <SettingRow icon="lock-closed-outline" label="Privacy & security" onPress={() => {}} />
          <View style={styles.rowDivider} />
          <SettingRow icon="card-outline" label="Payments" onPress={() => {}} />
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.sectionCard}>
          <SettingRow icon="help-circle-outline" label="Get help" onPress={() => {}} />
          <View style={styles.rowDivider} />
          <SettingRow icon="document-text-outline" label="Terms of service" onPress={() => {}} />
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <View style={styles.sectionCard}>
          <SettingRow icon="log-out-outline" label="Log out" onPress={handleLogout} danger />
        </View>
      </View>

      <Text style={styles.version}>StayFinder v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    gap: 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  guestTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 22,
    color: Colors.text,
    textAlign: "center",
    marginTop: 8,
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
    paddingHorizontal: 48,
    paddingVertical: 14,
  },
  loginButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.white,
  },
  signupLink: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  signupLinkBold: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textDecorationLine: "underline",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: Colors.background,
    gap: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 24,
    color: Colors.white,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
  },
  userEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  roleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    paddingVertical: 16,
    marginBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statDivider: {
    width: 0.5,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: Colors.background,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingRowPressed: {
    backgroundColor: Colors.surface,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  settingLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
  },
  rowDivider: {
    height: 0.5,
    backgroundColor: Colors.borderLight,
    marginLeft: 50,
  },
  version: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center",
    paddingTop: 8,
    paddingBottom: 16,
  },
});
