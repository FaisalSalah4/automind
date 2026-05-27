import React, { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { usePathname } from 'expo-router'
import { router } from 'expo-router'
import { useTheme } from '@/lib/theme'
import { usePinnedTabs, ALL_TABS } from '@/lib/tabConfig'
import type { TabDefinition } from '@/lib/tabConfig'
import { TabCustomizer } from '@/components/TabCustomizer'

export const TAB_BAR_HEIGHT = 60

function pathnameToTabKey(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'dashboard'
  if (pathname === '/chat') return 'ai-chat'
  return pathname.startsWith('/') ? pathname.slice(1) : pathname
}

function routeToHref(route: string): string {
  return route === 'index' ? '/' : `/${route}`
}

export function BottomTabBar() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const { pinnedTabs } = usePinnedTabs()
  const [showCustomizer, setShowCustomizer] = useState(false)

  const tabs = pinnedTabs
    .map((key) => ALL_TABS.find((t) => t.key === key))
    .filter((t): t is TabDefinition => t !== undefined)

  const activeKey = pathnameToTabKey(pathname)

  function navigateTo(tab: TabDefinition) {
    const href = routeToHref(tab.route)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.navigate(href as any)
  }

  return (
    <>
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          paddingBottom: insets.bottom,
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => navigateTo(tab)}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={24}
                color={isActive ? colors.activeTab : colors.textMuted}
              />
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 10,
                  marginTop: 3,
                  fontWeight: isActive ? '600' : '400',
                  color: isActive ? colors.activeTab : colors.textMuted,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}

        {/* Edit button */}
        <TouchableOpacity
          onPress={() => setShowCustomizer(true)}
          style={{ paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' }}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.textMuted} />
          <Text style={{ fontSize: 10, marginTop: 3, color: colors.textMuted }}>Edit</Text>
        </TouchableOpacity>
      </View>

      <TabCustomizer
        visible={showCustomizer}
        onClose={() => setShowCustomizer(false)}
      />
    </>
  )
}
