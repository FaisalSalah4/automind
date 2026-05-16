import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ComponentProps } from 'react'
import { Ionicons } from '@expo/vector-icons'

const STORAGE_KEY = 'automind_pinned_tabs'
export const MAX_PINNED = 5
export const MIN_PINNED = 2

export interface TabDefinition {
  key: string
  label: string
  icon: ComponentProps<typeof Ionicons>['name']
  activeIcon: ComponentProps<typeof Ionicons>['name']
  route: string
}

export const ALL_TABS: TabDefinition[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'speedometer-outline',
    activeIcon: 'speedometer',
    route: 'index',
  },
  {
    key: 'cars',
    label: 'Cars',
    icon: 'car-outline',
    activeIcon: 'car',
    route: 'cars',
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    icon: 'construct-outline',
    activeIcon: 'construct',
    route: 'maintenance',
  },
  {
    key: 'fuel',
    label: 'Fuel',
    icon: 'flame-outline',
    activeIcon: 'flame',
    route: 'fuel',
  },
  {
    key: 'accidents',
    label: 'Accidents',
    icon: 'warning-outline',
    activeIcon: 'warning',
    route: 'accidents',
  },
  {
    key: 'ai-chat',
    label: 'AI Chat',
    icon: 'chatbubble-ellipses-outline',
    activeIcon: 'chatbubble-ellipses',
    route: 'chat',
  },
]

const DEFAULT_PINNED: string[] = ['dashboard', 'cars', 'maintenance', 'ai-chat']

interface PinnedTabsContextValue {
  pinnedTabs: string[]
  savePinnedTabs: (keys: string[]) => Promise<void>
}

const PinnedTabsContext = createContext<PinnedTabsContextValue>({
  pinnedTabs: DEFAULT_PINNED,
  savePinnedTabs: async () => {},
})

export function PinnedTabsProvider({ children }: { children: React.ReactNode }) {
  const [pinnedTabs, setPinnedTabs] = useState<string[]>(DEFAULT_PINNED)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (!val) return
      try {
        const parsed: unknown = JSON.parse(val)
        if (Array.isArray(parsed) && parsed.length >= MIN_PINNED) {
          setPinnedTabs(parsed as string[])
        }
      } catch {
        // ignore malformed storage
      }
    })
  }, [])

  async function savePinnedTabs(keys: string[]) {
    const clamped = keys.slice(0, MAX_PINNED)
    setPinnedTabs(clamped)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clamped))
  }

  return (
    <PinnedTabsContext.Provider value={{ pinnedTabs, savePinnedTabs }}>
      {children}
    </PinnedTabsContext.Provider>
  )
}

export function usePinnedTabs() {
  return useContext(PinnedTabsContext)
}
