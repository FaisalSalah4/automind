import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'automind_theme'

export type Colors = {
  bg: string
  card: string
  cardBorder: string
  text: string
  textMuted: string
  tabBar: string
  tabBarBorder: string
  activeTab: string
  hero: string
  input: string
  inputBorder: string
  buttonText: string
}

const dark: Colors = {
  bg: '#0F1117',
  card: 'rgba(255,255,255,0.05)',
  cardBorder: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textMuted: '#6B7280',
  tabBar: '#0F1117',
  tabBarBorder: 'rgba(255,255,255,0.08)',
  activeTab: '#22D3EE',
  hero: '#1E3A8A',
  input: '#1A1D27',
  inputBorder: 'rgba(255,255,255,0.1)',
  buttonText: '#0F1117',
}

const light: Colors = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',
  text: '#111827',
  textMuted: '#6B7280',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  activeTab: '#2563EB',
  hero: '#2563EB',
  input: '#FFFFFF',
  inputBorder: '#D1D5DB',
  buttonText: '#FFFFFF',
}

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  colors: Colors
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  colors: dark,
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === 'dark' || val === 'light') setTheme(val)
    })
  }, [])

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    AsyncStorage.setItem(STORAGE_KEY, next)
  }

  const colors = theme === 'dark' ? dark : light

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
