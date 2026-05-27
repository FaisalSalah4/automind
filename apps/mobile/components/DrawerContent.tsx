import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useTheme } from '@/lib/theme'
import { usePinnedTabs, ALL_TABS } from '@/lib/tabConfig'
import { supabase } from '@/lib/supabase'

const CYAN = '#22D3EE'
const APP_VERSION = '0.1.0'

interface NavItem {
  name: string
  label: string
  icon: React.ComponentProps<typeof Ionicons>['name']
}

const NAV_ITEMS: NavItem[] = [
  { name: 'index', label: 'Dashboard', icon: 'speedometer' },
  { name: 'cars', label: 'Cars', icon: 'car' },
  { name: 'maintenance', label: 'Maintenance', icon: 'construct' },
  { name: 'fuel', label: 'Fuel', icon: 'flame' },
  { name: 'accidents', label: 'Accidents', icon: 'warning' },
  { name: 'reminders', label: 'Reminders', icon: 'notifications' },
  { name: 'chat', label: 'AI Chat', icon: 'chatbubble-ellipses' },
  { name: 'settings', label: 'Settings', icon: 'settings-outline' },
]

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { theme, colors, toggleTheme } = useTheme()
  const { pinnedTabs } = usePinnedTabs()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const activeName = props.state.routes[props.state.index]?.name ?? ''

  function isRoutePinned(routeName: string): boolean {
    return ALL_TABS.some((t) => t.route === routeName && pinnedTabs.includes(t.key))
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  function deleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) throw new Error('No user found')

              const { data: userCars } = await supabase
                .from('cars')
                .select('id')
                .eq('user_id', user.id)

              const carIds = (userCars ?? []).map((c) => c.id)

              await supabase.from('reminders').delete().eq('user_id', user.id)

              if (carIds.length > 0) {
                await supabase.from('maintenance_logs').delete().in('car_id', carIds)
                await supabase.from('fuel_logs').delete().in('car_id', carIds)
                await supabase.from('accident_logs').delete().in('car_id', carIds)
              }

              await supabase.from('cars').delete().eq('user_id', user.id)

              const { error: rpcError } = await supabase.rpc('delete_user')
              await supabase.auth.signOut()

              if (rpcError) {
                Alert.alert(
                  'Data Deleted',
                  'Your data has been deleted. Contact support to remove your account login.'
                )
              }

              router.replace('/(auth)/login')
            } catch {
              Alert.alert('Error', 'Something went wrong. Please try again.')
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
          AutoMind
        </Text>
      </View>
      <View style={{ height: 1, backgroundColor: colors.cardBorder }} />

      {/* Nav items */}
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
      >
        {NAV_ITEMS.map((item) => {
          const active = activeName === item.name
          const pinned = isRoutePinned(item.name)
          return (
            <TouchableOpacity
              key={item.name}
              onPress={() => props.navigation.navigate(item.name)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginHorizontal: 12,
                marginVertical: 2,
                paddingVertical: 13,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: active ? 'rgba(34,211,238,0.08)' : 'transparent',
                borderLeftWidth: 3,
                borderLeftColor: active ? CYAN : 'transparent',
              }}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={active ? CYAN : colors.textMuted}
                style={{ marginRight: 14 }}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: active ? '600' : '500',
                  color: active ? CYAN : colors.text,
                }}
              >
                {item.label}
              </Text>
              {pinned && (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.activeTab,
                  }}
                />
              )}
            </TouchableOpacity>
          )
        })}
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <View style={{ height: 1, backgroundColor: colors.cardBorder, marginBottom: 4 }} />

        <TouchableOpacity
          onPress={toggleTheme}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13 }}
        >
          <Ionicons
            name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'}
            size={20}
            color={colors.textMuted}
            style={{ marginRight: 14 }}
          />
          <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 1, backgroundColor: colors.cardBorder }} />

        <TouchableOpacity
          onPress={signOut}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13 }}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color="#EF4444"
            style={{ marginRight: 14 }}
          />
          <Text style={{ fontSize: 15, fontWeight: '500', color: '#EF4444' }}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 1, backgroundColor: colors.cardBorder }} />

        <TouchableOpacity
          onPress={deleteAccount}
          disabled={deleting}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 11,
            opacity: deleting ? 0.5 : 1,
          }}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color="#EF4444"
            style={{ marginRight: 14 }}
          />
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#EF4444' }}>
            {deleting ? 'Deleting…' : 'Delete Account'}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>
          v{APP_VERSION}
        </Text>
      </View>
    </View>
  )
}
