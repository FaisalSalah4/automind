import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/theme'
import { TAB_BAR_HEIGHT } from '@/components/BottomTabBar'

export default function SettingsScreen() {
  const { theme, colors, toggleTheme } = useTheme()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null)
    })
  }, [])

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
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom }}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>

        {/* Account */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: colors.textMuted,
            letterSpacing: 1,
            marginTop: 24,
            marginBottom: 8,
          }}
        >
          ACCOUNT
        </Text>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            overflow: 'hidden',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
            <Ionicons
              name="person-circle-outline"
              size={20}
              color={colors.textMuted}
              style={{ marginRight: 12 }}
            />
            <View>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>
                Signed in as
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>
                {email ?? '—'}
              </Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: colors.cardBorder }} />
          <TouchableOpacity
            onPress={async () => {
              await supabase.auth.signOut()
              router.replace('/(auth)/login')
            }}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#EF4444"
              style={{ marginRight: 12 }}
            />
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#EF4444' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: colors.textMuted,
            letterSpacing: 1,
            marginTop: 24,
            marginBottom: 8,
          }}
        >
          PREFERENCES
        </Text>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
          }}
        >
          <TouchableOpacity
            onPress={toggleTheme}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'}
              size={20}
              color={colors.textMuted}
              style={{ marginRight: 12 }}
            />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: colors.text }}>
              {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: '#EF4444',
            letterSpacing: 1,
            marginTop: 24,
            marginBottom: 8,
          }}
        >
          DANGER ZONE
        </Text>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(239,68,68,0.3)',
          }}
        >
          <TouchableOpacity
            onPress={deleteAccount}
            disabled={deleting}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              opacity: deleting ? 0.6 : 1,
            }}
            activeOpacity={0.7}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#EF4444" style={{ marginRight: 12 }} />
            ) : (
              <Ionicons
                name="trash-outline"
                size={20}
                color="#EF4444"
                style={{ marginRight: 12 }}
              />
            )}
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#EF4444' }}>
              {deleting ? 'Deleting…' : 'Delete Account'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={{
            fontSize: 11,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: 32,
          }}
        >
          AutoMind v0.1.0
        </Text>
      </View>
    </ScrollView>
  )
}
