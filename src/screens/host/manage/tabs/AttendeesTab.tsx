import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ActivityIndicator, FlatList, Image, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
  ImageBackground, StatusBar,
} from 'react-native';  
import Ionicons from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'confirmed' | 'cancelled';

type Booking = {
  id: string;
  userId: string;
  bookingType: 'solo' | 'duo' | 'group';
  quantity: number;
  attendeeSnapshot: { name: string; age: number; gender: string };
  entryCode: string;
  entryStatus: 'pending' | 'checked_in' | 'rejected';
  status: 'confirmed' | 'cancelled';
  createdAt: any;
  verifiedAt: any;
};

type UserProfile = { photoUrl: string | null };

type Payment = {
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  paymentMethod: string;
  paidAt: any;
};

type Props = { eventId: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#FF4D6D', '#FF9F0A', '#34C759', '#06B6D4', '#8B2BE2',
  '#FF6B35', '#22D3EE', '#5856D6', '#FF2D55', '#A855F7',
];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'All'       },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const ENTRY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: '#FF9F0A', bg: 'rgba(255,159,10,0.15)' },
  checked_in: { label: 'Checked In', color: '#34C759', bg: 'rgba(52,199,89,0.15)'  },
  rejected:   { label: 'Rejected',   color: '#FF5252', bg: 'rgba(255,82,82,0.15)'  },
};

const TYPE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  solo:  { label: 'Solo',  color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.08)' },
  duo:   { label: 'Duo',   color: '#06B6D4', bg: 'rgba(6,182,212,0.16)' },
  group: { label: 'Group', color: '#A855F7', bg: 'rgba(139,43,226,0.18)' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

const getAvatarColor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

const fmtDate = (ts: any): string => {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch { return '—'; }
};

/**
 * Batch-fetches user profiles using Firestore's `in` operator (max 30 per query).
 * For 100 attendees this means only 4 Firestore reads total.
 */
const batchFetchProfiles = async (
  ids: string[],
): Promise<Record<string, UserProfile>> => {
  const result: Record<string, UserProfile> = {};
  const BATCH = 30;
  const batches = Array.from(
    { length: Math.ceil(ids.length / BATCH) },
    (_, i) => ids.slice(i * BATCH, (i + 1) * BATCH),
  );
  await Promise.all(
    batches.map(async batch => {
      const snap = await firestore()
        .collection('users')
        .where(firestore.FieldPath.documentId(), 'in', batch)
        .get();
      snap.docs.forEach(doc => {
        const d = doc.data();
        const primary =
          (d.photos ?? []).find((p: any) => p.isPrimary) ?? d.photos?.[0] ?? null;
        result[doc.id] = { photoUrl: primary?.url ?? null };
      });
    }),
  );
  return result;
};

// ─── Avatar ──────────────────────────────────────────────────────────────────
// Shows a colorful initial avatar immediately, then fades in the real photo
// once loaded. FlatList virtualization ensures only ~15 avatars exist at once.

const Avatar = React.memo(({ userId, name, photoUrl }: {
  userId: string;
  name: string;
  photoUrl?: string | null;
}) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <View style={avStyles.wrap}>
      <View style={[avStyles.bg, { backgroundColor: getAvatarColor(userId) }]}>
        <Text style={avStyles.initials}>{getInitials(name)}</Text>
      </View>
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={[avStyles.img, { opacity: loaded ? 1 : 0 }]}
          onLoad={() => setLoaded(true)}
        />
      ) : null}
    </View>
  );
});

const avStyles = StyleSheet.create({
  wrap:     { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  bg:       { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 17, fontFamily: 'Inter-Bold', color: '#FFF' },
  img:      { ...StyleSheet.absoluteFillObject },
});

// ─── Detail Row (used inside expanded section) ────────────────────────────────

const DetailRow = ({
  icon, label, value, valueColor, iconColor,
}: {
  icon: string; label: string; value: string;
  valueColor?: string; iconColor?: string;
}) => (
  <View style={rStyles.detailRow}>
    <Ionicons name={icon as any} size={14} color={iconColor ?? 'rgba(255,255,255,0.45)'} />
    <Text style={rStyles.detailLabel}>{label}</Text>
    <Text style={[rStyles.detailValue, valueColor ? { color: valueColor } : undefined]}>
      {value}
    </Text>
  </View>
);

// ─── Booking Row ─────────────────────────────────────────────────────────────

const BookingRow = React.memo(({
  booking, profile, expanded, onToggle,
}: {
  booking: Booking;
  profile?: UserProfile;
  expanded: boolean;
  onToggle: (id: string) => void;
}) => {
  const [payment,    setPayment]    = useState<Payment | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const fetched = useRef(false);

  // Fetch payment lazily — only when the row is first expanded
  useEffect(() => {
    if (!expanded || fetched.current) return;
    fetched.current = true;
    setPayLoading(true);
    firestore()
      .collection('payments')
      .where('bookingId', '==', booking.id)
      .limit(1)
      .get()
      .then(snap => {
        if (!snap.empty) setPayment(snap.docs[0].data() as Payment);
        setPayLoading(false);
      })
      .catch(() => setPayLoading(false));
  }, [expanded, booking.id]);

  const ec         = ENTRY_CFG[booking.entryStatus] ?? ENTRY_CFG.pending;
  const tc         = TYPE_CFG[booking.bookingType]  ?? TYPE_CFG.solo;
  const isCancelled = booking.status === 'cancelled';

  const paymentText =
    !payment
      ? 'Free Entry'
      : payment.status === 'paid'
      ? `₹${payment.amount} · ${payment.paymentMethod}`
      : payment.status === 'pending'
      ? 'Pending'
      : 'Failed';

  const paymentColor =
    payment?.status === 'paid'   ? '#34C759' :
    payment?.status === 'failed' ? '#FF5252' : undefined;

  return (
    <TouchableOpacity
      style={[rStyles.card, expanded && rStyles.cardExpanded]}
      onPress={() => onToggle(booking.id)}
      activeOpacity={0.8}
    >
      {/* ── Collapsed row ── */}
      <View style={rStyles.row}>
        <Avatar
          userId={booking.userId}
          name={booking.attendeeSnapshot.name}
          photoUrl={profile?.photoUrl}
        />

        <View style={rStyles.info}>
          <View style={rStyles.nameRow}>
            <Text
              style={[rStyles.name, isCancelled && rStyles.nameCanc]}
              numberOfLines={1}
            >
              {booking.attendeeSnapshot.name}
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="rgba(255,255,255,0.45)"
            />
          </View>

          <Text style={rStyles.meta}>
            {booking.attendeeSnapshot.age} yrs · {booking.attendeeSnapshot.gender}
          </Text>

          <Text style={rStyles.code}>
            {'Code · '}
            <Text style={rStyles.codeVal}>{booking.entryCode}</Text>
          </Text>

          <View style={rStyles.badges}>
            {booking.bookingType !== 'solo' && (
              <View style={[rStyles.badge, { backgroundColor: tc.bg }]}>
                <Text style={[rStyles.badgeText, { color: tc.color }]}>
                  {tc.label}{booking.quantity > 1 ? ` ×${booking.quantity}` : ''}
                </Text>
              </View>
            )}
            <View style={[rStyles.badge, { backgroundColor: ec.bg }]}>
              <Text style={[rStyles.badgeText, { color: ec.color }]}>{ec.label}</Text>
            </View>
            {isCancelled && (
              <View style={[rStyles.badge, { backgroundColor: 'rgba(127,147,170,0.1)' }]}>
                <Text style={[rStyles.badgeText, { color: '#506A85' }]}>Cancelled</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Expanded details ── */}
      {expanded && (
        <View style={rStyles.expandedSection}>
          <View style={rStyles.divider} />

          <DetailRow
            icon="time-outline"
            label="Booked At"
            value={fmtDate(booking.createdAt)}
          />

          {booking.entryStatus === 'checked_in' && (
            <DetailRow
              icon="checkmark-circle-outline"
              iconColor="#34C759"
              label="Checked In"
              value={fmtDate(booking.verifiedAt)}
              valueColor="#34C759"
            />
          )}

          {payLoading ? (
            <View style={rStyles.detailRow}>
              <Ionicons name="card-outline" size={14} color="rgba(255,255,255,0.45)" />
              <Text style={rStyles.detailLabel}>Payment</Text>
              <ActivityIndicator size="small" color="#06B6D4" />
            </View>
          ) : (
            <DetailRow
              icon="card-outline"
              label="Payment"
              value={paymentText}
              valueColor={paymentColor}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

const rStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(26, 21, 48, 0.78)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.18)',
  },
  cardExpanded: {
    borderColor: 'rgba(6,182,212,0.45)',
    backgroundColor: 'rgba(26, 21, 48, 0.92)',
  },
  row:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  info:     { flex: 1 },
  nameRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name:     { flex: 1, fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  nameCanc: { color: 'rgba(255,255,255,0.35)' },
  meta:     { fontSize: 12, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  code:     { fontSize: 12, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.40)', marginTop: 3 },
  codeVal:  { fontFamily: 'Inter-SemiBold', color: '#22D3EE', letterSpacing: 1 },
  badges:   { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 },
  badge:    { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8 },
  badgeText:{ fontSize: 11, fontFamily: 'Inter-SemiBold' },

  expandedSection: { marginTop: 4 },
  divider:    { height: 1, backgroundColor: 'rgba(255,255,255,0.10)', marginVertical: 10 },
  detailRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  detailLabel:{ fontSize: 12, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.45)', flex: 1 },
  detailValue:{ fontSize: 12, fontFamily: 'Inter-SemiBold', color: 'rgba(255,255,255,0.75)', textAlign: 'right', flex: 2 },
});

// ─── Main Tab ────────────────────────────────────────────────────────────────

const AttendeesTab = ({ eventId }: Props) => {
  const [bookings,   setBookings]   = useState<Booking[]>([]);
  const [profiles,   setProfiles]   = useState<Record<string, UserProfile>>({});
  const profileCache                = useRef<Record<string, UserProfile>>({});
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState<FilterKey>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // Real-time bookings listener
  useEffect(() => {
    const unsub = firestore()
      .collection('eventBookings')
      .where('eventId', '==', eventId)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
          setBookings(docs);
          setLoading(false);

          // Batch-fetch profiles for any uncached userIds
          const newIds = [...new Set(docs.map(d => d.userId))].filter(
            id => !(id in profileCache.current),
          );
          if (newIds.length > 0) {
            batchFetchProfiles(newIds).then(result => {
              profileCache.current = { ...profileCache.current, ...result };
              setProfiles(prev => ({ ...prev, ...result }));
            });
          }
        },
        () => setLoading(false),
      );
    return () => unsub();
  }, [eventId]);

  const stats = useMemo(() => ({
    total:     bookings.filter(b => b.status === 'confirmed').length,
    checkedIn: bookings.filter(b => b.entryStatus === 'checked_in').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }), [bookings]);

  const filtered = useMemo(() => {
    let list = bookings;
    if (filter !== 'all') list = list.filter(b => b.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(b => b.attendeeSnapshot.name.toLowerCase().includes(q));
    }
    return list;
  }, [bookings, filter, search]);

  const handleToggle = useCallback((id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  const renderItem = useCallback(({ item }: { item: Booking }) => (
    <BookingRow
      booking={item}
      profile={profiles[item.userId]}
      expanded={expandedId === item.id}
      onToggle={handleToggle}
    />
  ), [profiles, expandedId, handleToggle]);

  const keyExtractor = useCallback((item: Booking) => item.id, []);

  if (loading) {
    return (
      <ImageBackground
        source={require('../../../../assets/images/bg_splash.webp')}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
        blurRadius={6}
      >
        <View style={styles.backgroundOverlay}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#8B2BE2" />
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../../../assets/images/bg_splash.webp')}
      style={styles.backgroundImage}
      imageStyle={styles.backgroundImageStyle}
      blurRadius={6}
    >
      <View style={styles.backgroundOverlay}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* ── Summary stats ── */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{stats.total}</Text>
          <Text style={styles.statLbl}>Confirmed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#34C759' }]}>{stats.checkedIn}</Text>
          <Text style={styles.statLbl}>Checked In</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#FF5252' }]}>{stats.cancelled}</Text>
          <Text style={styles.statLbl}>Cancelled</Text>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.45)" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name…"
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          keyboardAppearance="dark"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.45)" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter bar ── */}
      <View style={styles.filterBar}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List or empty state ── */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={44} color="rgba(255,255,255,0.35)" />
          <Text style={styles.emptyTitle}>
            {bookings.length === 0 ? 'No Attendees Yet' : 'No Results'}
          </Text>
          <Text style={styles.emptySub}>
            {bookings.length === 0
              ? 'Bookings will appear here once people register.'
              : 'Try a different name or filter.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          extraData={expandedId}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(32, insets.bottom + 24) }]}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
    </ImageBackground>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    backgroundColor: '#0D0B1E',
  },
  backgroundImageStyle: {
    resizeMode: 'cover',
  },
  backgroundOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 11, 30, 0.72)',
  },
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(26, 21, 48, 0.78)',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.20)',
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statNum:     { fontSize: 22, fontFamily: 'Inter-Bold', color: '#FFFFFF' },
  statLbl:     { fontSize: 11, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.12)' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: 'rgba(22, 17, 43, 0.72)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.30)',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    padding: 0,
  },

  filterBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterChip: {
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(139,43,226,0.28)',
    borderColor: '#8B2BE2',
  },
  filterText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.55)',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },

  listContent: {
    paddingHorizontal: 16,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  emptySub: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
});

export default AttendeesTab;
