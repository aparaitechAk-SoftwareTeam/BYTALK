import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function AryaBottomNav({
  activeTab,
  onTabPress,
  unreadCount = 0,
  isPro = false,
}) {
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home', iconActive: 'home' },
    { id: 'learn', label: 'Learn', icon: 'book-outline', iconActive: 'book' },
    { id: 'pro', label: isPro ? 'PRO 👑' : 'Get Pro', icon: 'crown', iconActive: 'crown' },
    { id: 'call', label: 'Call', icon: 'call-outline', iconActive: 'call' },
    { id: 'discover', label: 'Discover', icon: 'compass-outline', iconActive: 'compass' },
  ];

  return (
    <View style={styles.navContainer}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabPress(tab.id)}
            style={styles.tabItem}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Navigate to ${tab.label}`}
          >
            {/* Active Pill indicator behind icon */}
            <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
              {tab.id === 'pro' ? (
                <MaterialCommunityIcons
                  name="crown"
                  size={24}
                  color={isActive ? '#5843E8' : '#737F96'}
                />
              ) : (
                <Ionicons
                  name={isActive ? tab.iconActive : tab.icon}
                  size={22}
                  color={isActive ? '#5843E8' : '#737F96'}
                />
              )}
            </View>

            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>

            {/* Unread badge if on discover/call */}
            {tab.id === 'discover' && unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECEEF5',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 22 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    position: 'relative',
  },
  iconWrapper: {
    width: 46,
    height: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapperActive: {
    backgroundColor: '#EDE9FE',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#737F96',
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    fontWeight: '700',
    color: '#5843E8',
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: '24%',
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  unreadText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
