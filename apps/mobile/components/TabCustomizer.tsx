import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import DraggableFlatList from 'react-native-draggable-flatlist'
import type { RenderItemParams } from 'react-native-draggable-flatlist'
import { ScaleDecorator } from 'react-native-draggable-flatlist'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/lib/theme'
import { usePinnedTabs, ALL_TABS, MAX_PINNED, MIN_PINNED } from '@/lib/tabConfig'
import type { TabDefinition } from '@/lib/tabConfig'

interface TabCustomizerProps {
  visible: boolean
  onClose: () => void
}

export function TabCustomizer({ visible, onClose }: TabCustomizerProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { pinnedTabs, savePinnedTabs } = usePinnedTabs()
  const [draftTabs, setDraftTabs] = useState<TabDefinition[]>([])

  useEffect(() => {
    if (visible) {
      const tabs = pinnedTabs
        .map((key) => ALL_TABS.find((t) => t.key === key))
        .filter((t): t is TabDefinition => t !== undefined)
      setDraftTabs(tabs)
    }
  }, [visible, pinnedTabs])

  const availableTabs = ALL_TABS.filter(
    (t) => !draftTabs.some((d) => d.key === t.key)
  )

  const atMax = draftTabs.length >= MAX_PINNED
  const atMin = draftTabs.length <= MIN_PINNED

  function addTab(tab: TabDefinition) {
    if (atMax) return
    setDraftTabs((prev) => [...prev, tab])
  }

  function removeTab(key: string) {
    if (atMin) return
    setDraftTabs((prev) => prev.filter((t) => t.key !== key))
  }

  async function handleDone() {
    await savePinnedTabs(draftTabs.map((t) => t.key))
    onClose()
  }

  const renderPinnedItem = ({ item, drag, isActive }: RenderItemParams<TabDefinition>) => (
    <ScaleDecorator activeScale={1.02}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: isActive ? colors.card : 'transparent',
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}
      >
        {/* Drag handle */}
        <TouchableOpacity
          onLongPress={drag}
          delayLongPress={150}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="reorder-three" size={22} color={colors.textMuted} />
        </TouchableOpacity>

        <Ionicons
          name={item.icon}
          size={20}
          color={colors.activeTab}
          style={{ marginRight: 12 }}
        />
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: colors.text }}>
          {item.label}
        </Text>

        {/* Remove button */}
        <TouchableOpacity
          onPress={() => removeTab(item.key)}
          disabled={atMin}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 4 }}
        >
          <Ionicons
            name="remove-circle"
            size={24}
            color={atMin ? colors.textMuted : '#EF4444'}
          />
        </TouchableOpacity>
      </View>
    </ScaleDecorator>
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={onClose}
        >
          {/* Inner Pressable stops tap propagation to backdrop */}
          <Pressable onPress={() => {}}>
            <View
              style={{
                backgroundColor: colors.input,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderTopWidth: 1,
                borderColor: colors.cardBorder,
                maxHeight: 560,
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.cardBorder,
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                  Customize Tabs
                </Text>
                <TouchableOpacity onPress={handleDone} activeOpacity={0.7}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.activeTab }}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* YOUR TABS section label */}
                <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: colors.textMuted,
                      letterSpacing: 1,
                    }}
                  >
                    YOUR TABS
                  </Text>
                </View>

                {/* Draggable pinned tabs */}
                <DraggableFlatList
                  data={draftTabs}
                  onDragEnd={({ data }) => setDraftTabs(data)}
                  keyExtractor={(item) => item.key}
                  renderItem={renderPinnedItem}
                  scrollEnabled={false}
                  activationDistance={5}
                />

                {/* ADD TABS section */}
                {availableTabs.length > 0 && (
                  <>
                    <View
                      style={{
                        paddingHorizontal: 20,
                        paddingTop: 16,
                        paddingBottom: 8,
                        borderTopWidth: 1,
                        borderTopColor: colors.cardBorder,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: colors.textMuted,
                          letterSpacing: 1,
                        }}
                      >
                        ADD TABS
                      </Text>
                      {atMax && (
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          Max 5 tabs
                        </Text>
                      )}
                    </View>

                    {availableTabs.map((tab) => (
                      <View
                        key={tab.key}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 20,
                          paddingVertical: 14,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.cardBorder,
                          opacity: atMax ? 0.4 : 1,
                        }}
                      >
                        <Ionicons
                          name={tab.icon}
                          size={20}
                          color={colors.textMuted}
                          style={{ marginRight: 12 }}
                        />
                        <Text
                          style={{ flex: 1, fontSize: 15, fontWeight: '500', color: colors.text }}
                        >
                          {tab.label}
                        </Text>
                        {!atMax && (
                          <TouchableOpacity
                            onPress={() => addTab(tab)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={{ padding: 4 }}
                          >
                            <Ionicons name="add-circle" size={24} color="#10B981" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </>
                )}

                <View style={{ height: insets.bottom + 24 }} />
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  )
}
