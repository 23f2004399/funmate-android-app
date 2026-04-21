import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import OverviewTab   from './tabs/OverviewTab';
import AttendeesTab  from './tabs/AttendeesTab';
import CheckInTab    from './tabs/CheckInTab';
import ChatTab       from './tabs/ChatTab';

// ─── Types ───────────────────────────────────────────────────────────────────

type EventStatus = 'draft' | 'live' | 'ended' | 'cancelled';

type TabId = 'overview' | 'attendees' | 'checkin' | 'chat';

const TAB_LIST: { id: TabId; label: string }[] = [
  { id: 'overview',   label: 'Overview'  },
  { id: 'attendees',  label: 'Attendees' },
  { id: 'checkin',    label: 'Check-In'  },
  { id: 'chat',       label: 'Chat'      },
];

const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',     color: 'rgba(255,255,255,0.72)', bg: 'rgba(255,255,255,0.08)' },
  live:      { label: 'Live',      color: '#06B6D4', bg: 'rgba(6,182,212,0.14)' },
  ended:     { label: 'Ended',     color: 'rgba(255,255,255,0.60)', bg: 'rgba(255,255,255,0.08)' },
  cancelled: { label: 'Cancelled', color: '#FF6B6B', bg: 'rgba(255,107,107,0.14)' },
};

// ─── Screen ──────────────────────────────────────────────────────────────────

const ManageEventScreen = () => {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();

  const {
    eventId,
    eventTitle,
    eventStatus: initialStatus,
  }: { eventId: string; eventTitle: string; eventStatus: EventStatus } = route.params;

  const [activeTab,     setActiveTab]     = useState<TabId>('overview');
  const [currentStatus, setCurrentStatus] = useState<EventStatus>(initialStatus);

  const cfg = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG.draft;

  // ── Tab content switch ────────────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':  return <OverviewTab  eventId={eventId} eventStatus={currentStatus} onStatusChange={setCurrentStatus} />;
      case 'attendees': return <AttendeesTab eventId={eventId} />;
      case 'checkin':   return <CheckInTab   eventId={eventId} />;
      case 'chat':      return <ChatTab      eventId={eventId} />;
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>{eventTitle}</Text>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* ── Tab Bar ── */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {TAB_LIST.map(tab => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {active && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.tabBarBorder} />
      </View>

      {/* ── Tab Content ── */}
      <View style={styles.tabContent}>
        {renderTabContent()}
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0B1E' },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: '#0D0B1E',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.22)',
  },
  statusText: { fontSize: 12, fontFamily: 'Inter-SemiBold', letterSpacing: 0.2 },

  // tab bar
  tabBarWrapper: { backgroundColor: '#0D0B1E' },
  tabBarContent: { paddingHorizontal: 20, gap: 8 },
  tabBarBorder: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginHorizontal: 20,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  tabItemActive: {},
  tabLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255,255,255,0.55)',
  },
  tabLabelActive: { color: '#FFFFFF' },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#8B2BE2',
  },

  // content area
  tabContent: {
    flex: 1,
    backgroundColor: '#0D0B1E',
  }
});

export default ManageEventScreen;
