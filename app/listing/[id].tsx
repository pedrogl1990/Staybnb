import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, setAuthToken } from "@/lib/query-client";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function AmenityChip({ label }: { label: string }) {
  return (
    <View style={styles.amenityChip}>
      <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
      <Text style={styles.amenityLabel}>{label}</Text>
    </View>
  );
}

function PhotoDots({ total, current }: { total: number; current: number }) {
  if (total <= 1) return null;
  return (
    <View style={styles.photoDots}>
      {Array.from({ length: Math.min(total, 5) }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i === current && styles.dotActive]}
        />
      ))}
    </View>
  );
}

// Simple calendar date picker
function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.datePickerField}>
      <Text style={styles.datePickerLabel}>{label}</Text>
      <TextInput
        style={styles.datePickerInput}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={Colors.textLight}
      />
    </View>
  );
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showBooking, setShowBooking] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const { data: listing, isLoading } = useQuery<any>({
    queryKey: ["/api/listings", id],
    queryFn: async () => {
      const { getApiUrl } = await import("@/lib/query-client");
      const url = new URL(`/api/listings/${id}`, getApiUrl());
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(url.toString(), { headers });
      if (!res.ok) throw new Error("Listing not found");
      return res.json();
    },
    enabled: !!id,
  });

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user) { router.push("/auth/login"); return; }
      const res = await apiRequest("POST", `/api/wishlists/${id}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/listings", id] });
      qc.invalidateQueries({ queryKey: ["/api/wishlists"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bookings", {
        listing_id: id,
        check_in: checkIn,
        check_out: checkOut,
        guests_count: guests,
      });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/bookings/mine"] });
      setShowBooking(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Booking confirmed!",
        `Your stay at ${listing?.title} has been booked. Check your trips for details.`,
        [{ text: "View trips", onPress: () => router.push("/(tabs)/trips") }, { text: "OK" }]
      );
    },
    onError: (err: any) => {
      Alert.alert("Booking failed", err.message || "Please check your dates and try again.");
    },
  });

  const handleBook = () => {
    if (!user) { router.push("/auth/login"); return; }
    if (!checkIn || !checkOut) {
      Alert.alert("Select dates", "Please enter check-in and check-out dates.");
      return;
    }
    bookingMutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.border} />
        <Text style={styles.errorText}>Listing not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const photos: string[] = listing.photos || [];
  const price = (listing.price_per_night / 100).toFixed(0);
  const description = listing.description || "";
  const shortDescription = description.length > 200 ? description.slice(0, 200) + "..." : description;

  // Estimate nights for price display
  let nights = 0;
  let totalPrice = 0;
  if (checkIn && checkOut) {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    nights = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    if (nights > 0) totalPrice = (listing.price_per_night / 100) * nights;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Photo Gallery */}
        <View style={styles.photoContainer}>
          <FlatList
            data={photos.length > 0 ? photos : ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80"]}
            keyExtractor={(_, i) => i.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setPhotoIndex(idx);
            }}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.photo} contentFit="cover" />
            )}
          />
          <PhotoDots total={photos.length} current={photoIndex} />

          {/* Back Button */}
          <Pressable
            style={[styles.backButton, { top: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </Pressable>

          {/* Heart Button */}
          <Pressable
            style={[styles.heartButton, { top: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}
            onPress={() => wishlistMutation.mutate()}
          >
            <Ionicons
              name={listing.isWishlisted ? "heart" : "heart-outline"}
              size={22}
              color={listing.isWishlisted ? Colors.primary : Colors.text}
            />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.location}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
            {" "}{listing.location}
          </Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={Colors.star} />
            <Text style={styles.ratingText}>4.9</Text>
            <Text style={styles.ratingCount}>(128 reviews)</Text>
          </View>

          <View style={styles.divider} />

          {/* Host */}
          <View style={styles.hostRow}>
            <View style={styles.hostAvatar}>
              {listing.host?.avatar_url ? (
                <Image source={{ uri: listing.host.avatar_url }} style={styles.hostAvatarImg} contentFit="cover" />
              ) : (
                <View style={[styles.hostAvatarImg, styles.hostAvatarFallback]}>
                  <Text style={styles.hostInitial}>
                    {(listing.host?.name || "H")[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hostLabel}>Hosted by {listing.host?.name || "Host"}</Text>
              <Text style={styles.hostBio} numberOfLines={2}>{listing.host?.bio || "Superhost · 3 years hosting"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Details row */}
          <View style={styles.detailsRow}>
            <View style={styles.detail}>
              <Ionicons name="people-outline" size={22} color={Colors.text} />
              <Text style={styles.detailValue}>{listing.max_guests}</Text>
              <Text style={styles.detailLabel}>guests</Text>
            </View>
            <View style={styles.detail}>
              <Ionicons name="bed-outline" size={22} color={Colors.text} />
              <Text style={styles.detailValue}>{listing.bedrooms}</Text>
              <Text style={styles.detailLabel}>bedrooms</Text>
            </View>
            <View style={styles.detail}>
              <Ionicons name="water-outline" size={22} color={Colors.text} />
              <Text style={styles.detailValue}>{listing.bathrooms}</Text>
              <Text style={styles.detailLabel}>baths</Text>
            </View>
            <View style={styles.detail}>
              <Ionicons name="apps-outline" size={22} color={Colors.text} />
              <Text style={styles.detailValue}>{listing.beds}</Text>
              <Text style={styles.detailLabel}>beds</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionTitle}>About this place</Text>
          <Text style={styles.description}>
            {isExpanded ? description : shortDescription}
          </Text>
          {description.length > 200 && (
            <Pressable onPress={() => setIsExpanded(!isExpanded)}>
              <Text style={styles.readMore}>
                {isExpanded ? "Show less" : "Show more"}
              </Text>
            </Pressable>
          )}

          <View style={styles.divider} />

          {/* Amenities */}
          <Text style={styles.sectionTitle}>What this place offers</Text>
          <View style={styles.amenitiesGrid}>
            {(listing.amenities || []).map((a: string) => (
              <AmenityChip key={a} label={a} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 12 }]}>
        <View style={styles.priceBlock}>
          <Text style={styles.priceAmount}>${price}</Text>
          <Text style={styles.priceNight}> / night</Text>
        </View>
        <Pressable
          style={styles.bookButton}
          onPress={() => {
            if (!user) { router.push("/auth/login"); return; }
            setShowBooking(true);
          }}
        >
          <Text style={styles.bookButtonText}>Reserve</Text>
        </Pressable>
      </View>

      {/* Booking Modal */}
      <Modal
        visible={showBooking}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBooking(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reserve your stay</Text>
            <Pressable onPress={() => setShowBooking(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalListingTitle}>{listing.title}</Text>
            <Text style={styles.modalLocation}>{listing.city}, {listing.country}</Text>

            <View style={styles.divider} />

            <Text style={styles.modalSectionTitle}>Select dates</Text>
            <View style={styles.dateRow}>
              <DatePicker label="CHECK-IN" value={checkIn} onChange={setCheckIn} />
              <View style={styles.dateDivider} />
              <DatePicker label="CHECK-OUT" value={checkOut} onChange={setCheckOut} />
            </View>

            <View style={styles.divider} />

            <Text style={styles.modalSectionTitle}>Guests</Text>
            <View style={styles.guestSelector}>
              <Text style={styles.guestLabel}>Adults</Text>
              <View style={styles.guestControls}>
                <Pressable
                  style={[styles.guestBtn, guests <= 1 && styles.guestBtnDisabled]}
                  onPress={() => guests > 1 && setGuests(guests - 1)}
                >
                  <Ionicons name="remove" size={18} color={guests <= 1 ? Colors.textLight : Colors.text} />
                </Pressable>
                <Text style={styles.guestCount}>{guests}</Text>
                <Pressable
                  style={[styles.guestBtn, guests >= listing.max_guests && styles.guestBtnDisabled]}
                  onPress={() => guests < listing.max_guests && setGuests(guests + 1)}
                >
                  <Ionicons name="add" size={18} color={guests >= listing.max_guests ? Colors.textLight : Colors.text} />
                </Pressable>
              </View>
            </View>
            <Text style={styles.guestMax}>Maximum {listing.max_guests} guests</Text>

            {nights > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.modalSectionTitle}>Price breakdown</Text>
                <View style={styles.priceBreakdown}>
                  <View style={styles.priceBreakdownRow}>
                    <Text style={styles.priceBreakdownLabel}>${price} × {nights} nights</Text>
                    <Text style={styles.priceBreakdownValue}>${totalPrice.toFixed(0)}</Text>
                  </View>
                  <View style={styles.priceBreakdownRow}>
                    <Text style={styles.priceBreakdownLabel}>Service fee</Text>
                    <Text style={styles.priceBreakdownValue}>${(totalPrice * 0.12).toFixed(0)}</Text>
                  </View>
                  <View style={[styles.priceBreakdownRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>${(totalPrice * 1.12).toFixed(0)}</Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable
              style={[styles.confirmButton, bookingMutation.isPending && styles.confirmButtonDisabled]}
              onPress={handleBook}
              disabled={bookingMutation.isPending}
            >
              {bookingMutation.isPending ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm reservation</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.textSecondary,
  },
  backLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.primary,
  },
  photoContainer: {
    position: "relative",
    height: 320,
  },
  photo: {
    width: SCREEN_WIDTH,
    height: 320,
  },
  photoDots: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: {
    backgroundColor: Colors.white,
    width: 16,
  },
  backButton: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  heartButton: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    padding: 20,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    lineHeight: 30,
  },
  location: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  ratingText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  ratingCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  hostAvatar: {},
  hostAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  hostAvatarFallback: {
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  hostInitial: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.white,
  },
  hostLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
  hostBio: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  detail: {
    alignItems: "center",
    gap: 4,
  },
  detailValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  detailLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 12,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
  },
  readMore: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    textDecorationLine: "underline",
    marginTop: 8,
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  amenityLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.text,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  priceBlock: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
  },
  priceNight: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  bookButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  bookButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.white,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.text,
  },
  modalContent: {
    padding: 20,
  },
  modalListingTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.text,
  },
  modalLocation: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  modalSectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    overflow: "hidden",
  },
  datePickerField: {
    flex: 1,
    padding: 14,
  },
  datePickerLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  datePickerInput: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.text,
  },
  dateDivider: {
    width: 0.5,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  guestSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  guestLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.text,
  },
  guestControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  guestBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  guestBtnDisabled: {
    borderColor: Colors.borderLight,
  },
  guestCount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.text,
    minWidth: 24,
    textAlign: "center",
  },
  guestMax: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  priceBreakdown: {
    gap: 12,
  },
  priceBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  priceBreakdownLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
  },
  priceBreakdownValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.text,
  },
  totalRow: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  totalValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.white,
  },
});
