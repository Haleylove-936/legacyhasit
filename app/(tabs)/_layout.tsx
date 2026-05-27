import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ImageBackground, View, Platform } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useStore } from '@/lib/store';

const WOOD_BG = require('@/assets/images/wood-bg.jpg');

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const bottomPadding = Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;
  const isElder = state.userRole === 'elder';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: 'transparent',
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          position: 'absolute',
        },
        tabBarBackground: () => (
          <ImageBackground
            source={WOOD_BG}
            style={{ flex: 1 }}
            resizeMode="cover"
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(18, 10, 4, 0.72)' }} />
          </ImageBackground>
        ),
        tabBarLabelStyle: {
          fontFamily: 'PlayfairDisplay_700Bold',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="memories"
        options={{
          title: 'Stories',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="book.fill" color={color} />,
        }}
      />
      {/* Search - Available via Stories screen usually, hiding from bottom bar to reduce clutter */}
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          href: null,
        }}
      />
      {/* Timeline - Family social feed */}
      <Tabs.Screen
        name="timeline"
        options={{
          title: 'Timeline',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
