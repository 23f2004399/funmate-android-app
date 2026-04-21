/**
 * CREATE EVENT — STEP 3: PRICING & CAPACITY
 * Price, Capacity, Age Restrictions, Gender Restrictions, Entry Code Length
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Switch,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Step1Data } from './CreateEventStep1Screen';
import { Step2Data } from './CreateEventStep2Screen';
import LinearGradient from 'react-native-linear-gradient';

export type Step3Data = {
  price: number;
  isFree: boolean;
  capacityType: 'limited' | 'unlimited';
  capacityTotal: number | null;
  hasAgeRestriction: boolean;
  ageMin: number | null;
  ageMax: number | null;
  hasGenderRestriction: boolean;
  genderRestrictions: string[] | null;
  entryCodeLength: number;
  allowedBookingTypes: ('solo' | 'duo' | 'group')[];
  maxGroupSize: number | null;
};

const GENDERS = ['Male', 'Female', 'Trans', 'Non-Binary'];

const CreateEventStep3Screen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { step1, step2 } = route.params as { step1: Step1Data; step2: Step2Data };

  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState('');
  const [capacityType, setCapacityType] = useState<'limited' | 'unlimited'>('limited');
  const [capacityTotal, setCapacityTotal] = useState('');
  const [hasAgeRestriction, setHasAgeRestriction] = useState(false);
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('');
  const [hasGenderRestriction, setHasGenderRestriction] = useState(false);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [entryCodeLength, setEntryCodeLength] = useState(6);
  const [bookingDuo,       setBookingDuo]       = useState(false);
  const [bookingGroup,     setBookingGroup]     = useState(false);
  const [maxGroupSize,     setMaxGroupSize]     = useState('6');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleGender = (gender: string) => {
    setSelectedGenders(prev =>
      prev.includes(gender) ? prev.filter(g => g !== gender) : [...prev, gender]
    );
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!isFree) {
      const p = parseFloat(price);
      if (!price || isNaN(p) || p < 0) newErrors.price = 'Enter a valid price';
    }
    if (capacityType === 'limited') {
      const c = parseInt(capacityTotal);
      if (!capacityTotal || isNaN(c) || c < 1) newErrors.capacity = 'Enter a valid capacity (min 1)';
    }
    if (hasAgeRestriction) {
      const min = parseInt(ageMin);
      const max = ageMax ? parseInt(ageMax) : null;
      if (isNaN(min) || min < 1 || min > 100) newErrors.ageMin = 'Enter a valid minimum age';
      if (max !== null && (isNaN(max) || max <= min)) newErrors.ageMax = 'Max age must be greater than min age';
    }
    if (hasGenderRestriction && selectedGenders.length === 0) {
      newErrors.gender = 'Select at least one gender';
    }
    if (bookingGroup) {
      const mg = parseInt(maxGroupSize);
      if (!maxGroupSize || isNaN(mg) || mg < 3 || mg > 20)
        newErrors.maxGroupSize = 'Enter a valid max group size (3–20)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    const step3: Step3Data = {
      price: isFree ? 0 : parseFloat(price) || 0,
      isFree,
      capacityType,
      capacityTotal: capacityType === 'limited' ? parseInt(capacityTotal) || null : null,
      hasAgeRestriction,
      ageMin: hasAgeRestriction ? parseInt(ageMin) || null : null,
      ageMax: hasAgeRestriction && ageMax ? parseInt(ageMax) : null,
      hasGenderRestriction,
      genderRestrictions: hasGenderRestriction ? selectedGenders.map(g => g.toLowerCase()) : null,
      entryCodeLength,
      allowedBookingTypes: ['solo', ...(bookingDuo ? ['duo'] : []), ...(bookingGroup ? ['group'] : [])] as ('solo' | 'duo' | 'group')[],
      maxGroupSize: bookingGroup ? parseInt(maxGroupSize) || 6 : null,
    };
    navigation.navigate('CreateEventStep4', { step1, step2, step3 });
  };

  return (
    <ImageBackground
      source={require('../../../assets/images/bg_party.webp')}
      style={styles.container}
      resizeMode="cover"
      blurRadius={6}
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Event</Text>
          <View style={styles.backButton} />
        </View>

        {/* Step Indicator */}
        <View style={styles.stepContainer}>
          {[1, 2, 3, 4].map(step => (
            <View key={step} style={styles.stepWrapper}>
              <View style={[styles.stepBar, step <= 3 && styles.stepBarActive]} />
              <Text style={[styles.stepText, step === 3 && styles.stepTextActive]}>{step}</Text>
            </View>
          ))}
        </View>

        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(120, insets.bottom + 104) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          enableOnAndroid
          extraScrollHeight={220}
          enableAutomaticScroll
        >
          <Text style={styles.stepTitle}>Pricing & Capacity</Text>
          <Text style={styles.stepSubtitle}>Set ticket price and attendee limits</Text>

        {/* Free Event Toggle */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Free Event</Text>
            <Text style={styles.toggleSubLabel}>No ticket price charged</Text>
          </View>
          <Switch
            value={isFree}
            onValueChange={v => { setIsFree(v); if (v) setErrors(e => ({ ...e, price: '' })); }}
            trackColor={{ false: 'rgba(139, 92, 246, 0.30)', true: '#06B6D4' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Price */}
        {!isFree && (
          <View style={styles.field}>
            <Text style={styles.label}>Price per Head <Text style={styles.required}>*</Text></Text>
            <View style={styles.priceRow}>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyText}>₹</Text>
              </View>
              <TextInput
                style={[styles.priceInput, errors.price && styles.inputError]}
                placeholder="0"
                placeholderTextColor="#506A85"
                value={price}
                onChangeText={v => { setPrice(v); if (errors.price) setErrors(e => ({ ...e, price: '' })); }}
                keyboardType="decimal-pad"
              />
            </View>
            {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}
          </View>
        )}

        {/* Capacity */}
        <View style={styles.field}>
          <Text style={styles.label}>Capacity</Text>
          <View style={styles.capacityRow}>
            <TouchableOpacity
              style={[styles.capacityOption, capacityType === 'limited' && styles.capacityOptionActive]}
              onPress={() => setCapacityType('limited')}
              activeOpacity={0.8}
            >
              <View style={styles.radioCircle}>
                {capacityType === 'limited' && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.capacityLabel, capacityType === 'limited' && styles.capacityLabelActive]}>
                Limited
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.capacityOption, capacityType === 'unlimited' && styles.capacityOptionActive]}
              onPress={() => setCapacityType('unlimited')}
              activeOpacity={0.8}
            >
              <View style={styles.radioCircle}>
                {capacityType === 'unlimited' && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.capacityLabel, capacityType === 'unlimited' && styles.capacityLabelActive]}>
                Unlimited
              </Text>
            </TouchableOpacity>
          </View>
          {capacityType === 'limited' && (
            <TextInput
              style={[styles.input, { marginTop: 12 }, errors.capacity && styles.inputError]}
              placeholder="Max number of attendees"
              placeholderTextColor="#506A85"
              value={capacityTotal}
              onChangeText={v => { setCapacityTotal(v); if (errors.capacity) setErrors(e => ({ ...e, capacity: '' })); }}
              keyboardType="number-pad"
            />
          )}
          {errors.capacity ? <Text style={styles.errorText}>{errors.capacity}</Text> : null}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Age Restriction */}
        <View style={styles.restrictionBlock}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Age Restriction</Text>
              <Text style={styles.toggleSubLabel}>Limit event to age range</Text>
            </View>
            <Switch
              value={hasAgeRestriction}
              onValueChange={setHasAgeRestriction}
              trackColor={{ false: 'rgba(139, 92, 246, 0.30)', true: '#06B6D4' }}
              thumbColor="#FFFFFF"
            />
          </View>
          {hasAgeRestriction && (
            <View style={styles.ageRow}>
              <View style={styles.ageField}>
                <Text style={styles.ageLabel}>Min Age <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.ageInput, errors.ageMin && styles.inputError]}
                  value={ageMin}
                  onChangeText={v => { setAgeMin(v); if (errors.ageMin) setErrors(e => ({ ...e, ageMin: '' })); }}
                  keyboardType="number-pad"
                  placeholder="18"
                  placeholderTextColor="#506A85"
                />
                {errors.ageMin ? <Text style={styles.errorText}>{errors.ageMin}</Text> : null}
              </View>
              <View style={styles.ageDash}>
                <Text style={styles.ageDashText}>–</Text>
              </View>
              <View style={styles.ageField}>
                <Text style={styles.ageLabel}>Max Age</Text>
                <TextInput
                  style={[styles.ageInput, errors.ageMax && styles.inputError]}
                  value={ageMax}
                  onChangeText={v => { setAgeMax(v); if (errors.ageMax) setErrors(e => ({ ...e, ageMax: '' })); }}
                  keyboardType="number-pad"
                  placeholder="No limit"
                  placeholderTextColor="#506A85"
                />
                {errors.ageMax ? <Text style={styles.errorText}>{errors.ageMax}</Text> : null}
              </View>
            </View>
          )}
        </View>

        {/* Gender Restriction */}
        <View style={styles.restrictionBlock}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Gender Restriction</Text>
              <Text style={styles.toggleSubLabel}>Limit to specific genders</Text>
            </View>
            <Switch
              value={hasGenderRestriction}
              onValueChange={setHasGenderRestriction}
              trackColor={{ false: 'rgba(139, 92, 246, 0.30)', true: '#06B6D4' }}
              thumbColor="#FFFFFF"
            />
          </View>
          {hasGenderRestriction && (
            <>
              <View style={styles.genderRow}>
                {GENDERS.map(gender => (
                  <TouchableOpacity
                    key={gender}
                    style={[styles.genderChip, selectedGenders.includes(gender) && styles.genderChipActive]}
                    onPress={() => { toggleGender(gender); if (errors.gender) setErrors(e => ({ ...e, gender: '' })); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.genderChipText, selectedGenders.includes(gender) && styles.genderChipTextActive]}>
                      {gender}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
            </>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Entry Code Length */}
        <View style={styles.field}>
          <Text style={styles.label}>Entry Code Length</Text>
          <Text style={styles.fieldHint}>Attendees will receive a code of this length to enter</Text>
          <View style={styles.codeLengthRow}>
            {[4, 6, 8].map(len => (
              <TouchableOpacity
                key={len}
                style={[styles.codeOption, entryCodeLength === len && styles.codeOptionActive]}
                onPress={() => setEntryCodeLength(len)}
                activeOpacity={0.8}
              >
                <Text style={[styles.codeOptionText, entryCodeLength === len && styles.codeOptionTextActive]}>
                  {len} digits
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Booking Types */}
        <View style={styles.field}>
          <Text style={styles.label}>Allowed Booking Types</Text>
          <Text style={styles.fieldHint}>Who can attend — solo only, or also pairs and groups?</Text>

          <View style={[styles.bookingTypeRow, styles.bookingTypeRowLocked]}>
            <View style={styles.bookingTypeLeft}>
              <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.35)" />
              <View>
                <Text style={styles.bookingTypeLabel}>Solo</Text>
                <Text style={styles.bookingTypeSub}>Always enabled</Text>
              </View>
            </View>
            <Ionicons name="checkmark-circle" size={22} color="#06B6D4" />
          </View>

          <TouchableOpacity
            style={[styles.bookingTypeRow, bookingDuo && styles.bookingTypeRowActive]}
            onPress={() => setBookingDuo(v => !v)}
            activeOpacity={0.8}
          >
            <View style={styles.bookingTypeLeft}>
              <Ionicons name="people-outline" size={18} color={bookingDuo ? '#8B2BE2' : 'rgba(255,255,255,0.35)'} />
              <View>
                <Text style={[styles.bookingTypeLabel, bookingDuo && { color: '#FFFFFF' }]}>Duo</Text>
                <Text style={styles.bookingTypeSub}>Two people, one shared code</Text>
              </View>
            </View>
            <Ionicons name={bookingDuo ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={bookingDuo ? '#8B2BE2' : 'rgba(255,255,255,0.35)'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bookingTypeRow, bookingGroup && styles.bookingTypeRowGroupActive]}
            onPress={() => setBookingGroup(v => !v)}
            activeOpacity={0.8}
          >
            <View style={styles.bookingTypeLeft}>
              <Ionicons name="people-circle-outline" size={18} color={bookingGroup ? '#06B6D4' : 'rgba(255,255,255,0.35)'} />
              <View>
                <Text style={[styles.bookingTypeLabel, bookingGroup && { color: '#FFFFFF' }]}>Group</Text>
                <Text style={styles.bookingTypeSub}>3 or more people, one code</Text>
              </View>
            </View>
            <Ionicons name={bookingGroup ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={bookingGroup ? '#06B6D4' : 'rgba(255,255,255,0.35)'} />
          </TouchableOpacity>

          {bookingGroup && (
            <View style={{ marginTop: 4 }}>
              <Text style={styles.ageLabel}>Max Group Size <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.maxGroupSize && styles.inputError]}
                placeholder="e.g. 6  (min 3, max 20)"
                placeholderTextColor="#506A85"
                value={maxGroupSize}
                onChangeText={v => { setMaxGroupSize(v); if (errors.maxGroupSize) setErrors(e => ({ ...e, maxGroupSize: '' })); }}
                keyboardType="number-pad"
              />
              {errors.maxGroupSize ? <Text style={styles.errorText}>{errors.maxGroupSize}</Text> : null}
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom + 16) }]}>
          <TouchableOpacity onPress={handleNext} activeOpacity={0.9}>
            <LinearGradient
              colors={['#8B2BE2', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButton}
            >
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 11, 30, 0.60)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: 'transparent',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  stepContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  stepWrapper: { flex: 1, alignItems: 'center', gap: 4 },
  stepBar: { height: 3, width: '100%', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  stepBarActive: { backgroundColor: '#8B2BE2' },
  stepText: { fontSize: 11, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.40)' },
  stepTextActive: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  stepTitle: { fontSize: 28, fontFamily: 'Inter-Bold', color: '#FFFFFF', marginBottom: 8 },
  stepSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 24,
    lineHeight: 22,
  },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontFamily: 'Inter-Medium', color: 'rgba(255,255,255,0.55)', marginBottom: 8 },
  fieldHint: { fontSize: 12, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.35)', marginBottom: 10, lineHeight: 18 },
  required: { color: '#22D3EE' },
  input: {
    height: 54,
    backgroundColor: '#16112B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.30)',
    paddingHorizontal: 18,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  inputError: { borderColor: '#FF5252' },
  errorText: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#FF5252', marginTop: 4 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  toggleLabel: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  toggleSubLabel: { fontSize: 12, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  priceRow: { flexDirection: 'row', gap: 0 },
  currencyBadge: {
    height: 54,
    backgroundColor: '#16112B',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.30)',
    borderRightWidth: 0,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyText: { fontSize: 18, fontFamily: 'Inter-Bold', color: '#06B6D4' },
  priceInput: {
    flex: 1,
    height: 54,
    backgroundColor: '#16112B',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.30)',
    borderLeftWidth: 0,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },

  capacityRow: { flexDirection: 'row', gap: 12 },
  capacityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    backgroundColor: '#16112B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.30)',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  capacityOptionActive: {
    borderColor: '#8B2BE2',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#06B6D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#06B6D4' },
  capacityLabel: { fontSize: 14, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.55)' },
  capacityLabelActive: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 20 },
  restrictionBlock: { marginBottom: 8 },

  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  ageField: { flex: 1 },
  ageLabel: { fontSize: 13, fontFamily: 'Inter-Medium', color: 'rgba(255,255,255,0.55)', marginBottom: 8 },
  ageInput: {
    height: 54,
    backgroundColor: '#16112B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.30)',
    paddingHorizontal: 18,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  ageDash: { paddingTop: 24, alignItems: 'center' },
  ageDashText: { fontSize: 20, color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter-Bold' },

  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  genderChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  genderChipActive: {
    backgroundColor: 'rgba(139,92,246,0.18)',
    borderColor: '#8B2BE2',
  },
  genderChipText: { fontSize: 13, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  genderChipTextActive: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },

  codeLengthRow: { flexDirection: 'row', gap: 12 },
  codeOption: {
    flex: 1,
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.30)',
    backgroundColor: '#16112B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeOptionActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    borderColor: '#8B2BE2',
  },
  codeOptionText: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: 'rgba(255,255,255,0.55)' },
  codeOptionTextActive: { color: '#FFFFFF' },

  bookingTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16112B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(139,92,246,0.25)',
    padding: 14,
    marginBottom: 8,
  },
  bookingTypeRowLocked: { opacity: 0.55 },
  bookingTypeRowActive: {
    borderColor: '#8B2BE2',
    backgroundColor: 'rgba(139,92,246,0.12)',
  },
  bookingTypeRowGroupActive: {
    borderColor: '#06B6D4',
    backgroundColor: 'rgba(6,182,212,0.10)',
  },
  bookingTypeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookingTypeLabel: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: 'rgba(255,255,255,0.55)' },
  bookingTypeSub: { fontSize: 12, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.35)', marginTop: 1 },

  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'transparent' },
  nextButton: {
    height: 54,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: { fontSize: 17, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
});

export default CreateEventStep3Screen;
