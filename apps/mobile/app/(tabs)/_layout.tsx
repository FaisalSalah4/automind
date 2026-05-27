import { Drawer } from 'expo-router/drawer'
import { Ionicons } from '@expo/vector-icons'
import { TouchableOpacity, Dimensions, View } from 'react-native'
import { useTheme } from '@/lib/theme'
import { CustomDrawerContent } from '@/components/DrawerContent'
import { BottomTabBar } from '@/components/BottomTabBar'

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.75, 300)
// Extra bottom padding added to every screen so content isn't hidden behind the tab bar.
const SCENE_PADDING_BOTTOM = 60

export default function DrawerLayout() {
  const { theme, colors } = useTheme()

  return (
    <View style={{ flex: 1 }}>
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
          sceneContainerStyle: { paddingBottom: SCENE_PADDING_BOTTOM },
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
        <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
      </Drawer>

      <BottomTabBar />
    </View>
  )
}
