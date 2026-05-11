import { Drawer } from 'expo-router/drawer'
import { Ionicons } from '@expo/vector-icons'
import { TouchableOpacity, Dimensions } from 'react-native'
import { useTheme } from '@/lib/theme'
import { CustomDrawerContent } from '@/components/DrawerContent'

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.75, 300)

export default function DrawerLayout() {
  const { theme, colors } = useTheme()

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        drawerStyle: {
          backgroundColor: colors.bg,
          width: DRAWER_WIDTH,
          borderRightWidth: 1,
          borderRightColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
        },
        drawerType: 'front',
        overlayColor: 'rgba(0,0,0,0.5)',
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={{ paddingLeft: 16, paddingRight: 8 }}
          >
            <Ionicons
              name="menu"
              size={24}
              color={theme === 'dark' ? '#FFFFFF' : '#111827'}
            />
          </TouchableOpacity>
        ),
      })}
    >
      <Drawer.Screen name="index" options={{ headerShown: false }} />
      <Drawer.Screen name="cars" options={{ title: 'Cars' }} />
      <Drawer.Screen name="maintenance" options={{ title: 'Maintenance' }} />
      <Drawer.Screen name="fuel" options={{ title: 'Fuel' }} />
      <Drawer.Screen name="accidents" options={{ title: 'Accidents' }} />
      <Drawer.Screen name="reminders" options={{ title: 'Reminders' }} />
      <Drawer.Screen name="chat" options={{ title: 'AI Chat' }} />
    </Drawer>
  )
}
