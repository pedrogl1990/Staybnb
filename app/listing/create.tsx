import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, setAuthToken } from "@/lib/query-client";
import { AMENITIES, CATEGORIES } from "@/data/categories";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

const STEPS = ["Basic info", "Details", "Photos & Amenities", "Price"];

// Default photo sets per category
const CATEGORY_PHOTOS: Record<string, string[]> = {
  beachfront: [
    "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
  ],
  mountains: [
    "https://images.unsplash.com/photo-1452784444945-3f422708fe5e?w=800&q=80",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
  ],
  city: [
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
  ],
  countryside: [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    "https://images.unsplash.com/photo-1601918774946-25832a4be0d6?w=800&q=80",
  ],
  treehouse: [
    "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80",
    "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800&q=80",
  ],
  luxury: [
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
  ],
  camping: [
    "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80",
    "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80",
  ],
  pool: [
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
  ],
  amazing_views: [
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  ],
};

export default function CreateListingScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("city");
  const [maxGuests, setMaxGuests] = useState(2);
  const [bedrooms, setBedrooms] = useState(1);
  const [beds, setBeds] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [price, setPrice] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  if (!user || user.role !== "host") {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Only hosts can create listings</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const toggleAmenity = (a: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const canContinue = () => {
    if (step === 0) return title.trim() && description.trim();
    if (step === 1) return location.trim() && city.trim() && country.trim() && category;
    if (step === 2) return true;
    if (step === 3) return price && parseFloat(price) > 0;
    return false;
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const photos = CATEGORY_PHOTOS[category] || [
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
      ];

      const res = await apiRequest("POST", "/api/listings", {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        city: city.trim(),
        country: country.trim(),
        category,
        price_per_night: parseFloat(price),
        max_guests: maxGuests,
        bedrooms,
        beds,
        bathrooms,
        amenities: selectedAmenities,
        photos,
      });
      const listing = await res.json();

      qc.invalidateQueries({ queryKey: ["/api/listings"] });
      qc.invalidateQueries({ queryKey: ["/api/listings/host/mine"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert("Listing created!", "Your listing is now live.", [
        {
          text: "View listing",
          onPress: () => {
            router.back();
            router.push({ pathname: "/listing/[id]", params: { id: listing.id } });
          },
        },
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create listing.");
    } finally {
      setIsLoading(false);
    }
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Create listing</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressBar}>
        {STEPS.map((s, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              i <= step && styles.progressSegmentActive,
            ]}
          />
        ))}
      </View>
      <Text style={styles.stepLabel}>
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Tell us about your place</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Cozy oceanfront villa"
                placeholderTextColor={Colors.textLight}
                maxLength={80}
              />
              <Text style={styles.charCount}>{title.length}/80</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textarea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your space, the neighborhood, and what guests can expect..."
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={6}
                maxLength={1000}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{description.length}/1000</Text>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Where is your place?</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full address *</Text>
              <TextInput
                style={styles.textInput}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. 123 Ocean Drive, Malibu"
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>City *</Text>
                <TextInput
                  style={styles.textInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Country *</Text>
                <TextInput
                  style={styles.textInput}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="Country"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Category *</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                  <Pressable
                    key={c.id}
                    style={[styles.categoryChip, category === c.id && styles.categoryChipSelected]}
                    onPress={() => setCategory(c.id)}
                  >
                    <Ionicons
                      name={c.icon as any}
                      size={16}
                      color={category === c.id ? Colors.white : Colors.textSecondary}
                    />
                    <Text style={[styles.categoryLabel, category === c.id && styles.categoryLabelSelected]}>
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Space details & amenities</Text>

            {[
              { label: "Max guests", value: maxGuests, setter: setMaxGuests, min: 1, max: 20 },
              { label: "Bedrooms", value: bedrooms, setter: setBedrooms, min: 0, max: 20 },
              { label: "Beds", value: beds, setter: setBeds, min: 1, max: 30 },
              { label: "Bathrooms", value: bathrooms, setter: setBathrooms, min: 1, max: 10 },
            ].map(({ label, value, setter, min, max }) => (
              <View key={label} style={styles.counterRow}>
                <Text style={styles.counterLabel}>{label}</Text>
                <View style={styles.counterControls}>
                  <Pressable
                    style={[styles.counterBtn, value <= min && styles.counterBtnDisabled]}
                    onPress={() => value > min && setter(value - 1)}
                  >
                    <Ionicons name="remove" size={18} color={value <= min ? Colors.textLight : Colors.text} />
                  </Pressable>
                  <Text style={styles.counterValue}>{value}</Text>
                  <Pressable
                    style={[styles.counterBtn, value >= max && styles.counterBtnDisabled]}
                    onPress={() => value < max && setter(value + 1)}
                  >
                    <Ionicons name="add" size={18} color={value >= max ? Colors.textLight : Colors.text} />
                  </Pressable>
                </View>
              </View>
            ))}

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {AMENITIES.map((a) => {
                const selected = selectedAmenities.includes(a);
                return (
                  <Pressable
                    key={a}
                    style={[styles.amenityChip, selected && styles.amenityChipSelected]}
                    onPress={() => toggleAmenity(a)}
                  >
                    {selected && (
                      <Ionicons name="checkmark" size={14} color={Colors.white} />
                    )}
                    <Text style={[styles.amenityLabel, selected && styles.amenityLabelSelected]}>
                      {a}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Set your price</Text>
            <Text style={styles.stepDesc}>
              Set a competitive nightly rate for your listing. You can always adjust it later.
            </Text>

            <View style={styles.priceInputContainer}>
              <Text style={styles.priceCurrency}>$</Text>
              <TextInput
                style={styles.priceInput}
                value={price}
                onChangeText={setPrice}
                placeholder="0"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
              />
              <Text style={styles.priceLabel}>/night</Text>
            </View>

            <View style={styles.priceSuggestions}>
              {["75", "120", "200", "350", "500"].map((p) => (
                <Pressable
                  key={p}
                  style={[styles.priceSuggestion, price === p && styles.priceSuggestionSelected]}
                  onPress={() => setPrice(p)}
                >
                  <Text style={[styles.priceSuggestionText, price === p && styles.priceSuggestionTextSelected]}>
                    ${p}
                  </Text>
                </Pressable>
              ))}
            </View>

            {price && parseFloat(price) > 0 && (
              <View style={styles.priceNote}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.priceNoteText}>
                  Guests will see ${(parseFloat(price) * 1.12).toFixed(0)}/night after fees
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Nav */}
      <View style={[styles.bottomNav, { paddingBottom: bottomPadding + 16 }]}>
        {step > 0 && (
          <Pressable style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        )}
        <Pressable
          style={[
            styles.nextBtn,
            step === 0 && { marginLeft: "auto" },
            !canContinue() && styles.nextBtnDisabled,
          ]}
          onPress={() => {
            if (step < STEPS.length - 1) {
              setStep(step + 1);
            } else {
              handleSubmit();
            }
          }}
          disabled={!canContinue() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {step < STEPS.length - 1 ? "Continue" : "Publish listing"}
              </Text>
              {!isLoading && (
                <Ionicons
                  name={step < STEPS.length - 1 ? "arrow-forward" : "checkmark"}
                  size={18}
                  color={Colors.white}
                />
              )}
            </>
          )}
        </Pressable>
      </View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: Colors.text,
  },
  progressBar: {
    flexDirection: "row",
    height: 3,
    backgroundColor: Colors.borderLight,
    gap: 2,
    marginHorizontal: 0,
  },
  progressSegment: {
    flex: 1,
    backgroundColor: Colors.borderLight,
  },
  progressSegmentActive: {
    backgroundColor: Colors.primary,
  },
  stepLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  stepContent: {
    gap: 20,
    paddingTop: 20,
  },
  stepTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
  },
  stepDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  field: {
    gap: 8,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
  },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  textarea: {
    minHeight: 120,
    paddingTop: 14,
  },
  charCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textLight,
    textAlign: "right",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  categoryLabelSelected: {
    color: Colors.white,
  },
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  counterLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.text,
  },
  counterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnDisabled: {
    borderColor: Colors.borderLight,
  },
  counterValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.text,
    minWidth: 24,
    textAlign: "center",
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  amenityChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  amenityLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  amenityLabelSelected: {
    color: Colors.white,
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.text,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 8,
  },
  priceCurrency: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: Colors.text,
  },
  priceInput: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 48,
    color: Colors.text,
  },
  priceLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.textSecondary,
  },
  priceSuggestions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  priceSuggestion: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  priceSuggestionSelected: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  priceSuggestionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.text,
  },
  priceSuggestionTextSelected: {
    color: Colors.white,
  },
  priceNote: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  priceNoteText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    gap: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  backBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.text,
  },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  nextBtnDisabled: {
    opacity: 0.5,
  },
  nextBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.white,
  },
});
