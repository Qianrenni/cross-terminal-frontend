import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View } from 'react-native';
import { useThemeConfig } from '@/design/context';
import { QIcon } from '@/icon';
import { bottomTabStylesOf, type BottomTabStyles } from './style';
import type { QBottomTabItem, QBottomTabProps } from './type';

/**
 * `useNativeDriver` 只在原生端开。
 *
 * Web（react-native-web）没有 native driver，开了只会刷一条 warning；
 * 这里按平台区分，文档站控制台保持干净。
 */
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/** 缓动：膨大段用 out-quad（先快后慢），回弹段用 in-out-quad（短促收尾）。 */
const EASE_IN = Easing.out(Easing.quad);
const EASE_BOUNCE = Easing.inOut(Easing.quad);
const EASE_OUT = Easing.in(Easing.quad);

interface ItemProps {
  item: QBottomTabItem;
  selected: boolean;
  styles: BottomTabStyles;
  /** 选中态色（品牌色）：文字与选中图标共用 */
  activeColor: string;
  /** 未选中态色（次要文字色） */
  inactiveColor: string;
  iconSize: number;
  popScale: number;
  durationIn: number;
  bounceDuration: number;
  durationOut: number;
  onPress: (key: string) => void;
}

/**
 * 单个标签项。
 *
 * **两个 icon 同时渲染**在同一个 24×24 盒子里，各自用 `Animated.Value` 驱动
 * `opacity` + `scale`：
 *
 * - `activeScale`：选中态图标的缩放，进场的两段是**串行**的
 *   （`Animated.sequence`）：`0 → popScale`（`durationIn`）→ `popScale → 1`（`bounceDuration`）；
 * - `activeOpacity`：选中态图标的透明度，和膨大段同步 `0 → 1`；
 * - `inactiveProgress`：未选中态图标，`scale` 与 `opacity` 一起 `1 → 0`。
 *
 * 之所以把回弹拆成独立一段，而不是一条 `0 → 1.2 → 1` 的关键帧：
 * 关键帧里两段共用同一条时间轴，回弹会被拉成和膨大一样长；
 * 串行后回弹可以单独压到 50ms，才有「弹一下」的手感。
 */
function BottomTabItemView({
  item,
  selected,
  styles,
  activeColor,
  inactiveColor,
  iconSize,
  popScale,
  durationIn,
  bounceDuration,
  durationOut,
  onPress,
}: ItemProps) {
  /**
   * 用 `useState` 持有 `Animated.Value`（而不是 `useRef().current`）：
   * 项目的 React Compiler 规则禁止在渲染期读 `ref.current`，而这里必须把它交给 style。
   * 惰性初始化保证实例只创建一次，之后永远不 set。
   */
  const [activeScale] = useState(() => new Animated.Value(selected ? 1 : 0));
  const [activeOpacity] = useState(() => new Animated.Value(selected ? 1 : 0));
  const [inactiveProgress] = useState(() => new Animated.Value(selected ? 0 : 1));

  /**
   * 首次挂载时**不播动画**：初始值已经是目标值，再跑一遍会把「膨大 → 回弹」
   * 白演一次（切页回来时特别明显）。
   *
   * 用 ref 而不用 state：它不参与渲染，只在 effect 里读写。
   */
  const isFirstRunRef = useRef(true);

  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }

    if (selected) {
      Animated.parallel([
        Animated.sequence([
          // 膨大：0 → popScale
          Animated.timing(activeScale, {
            toValue: popScale,
            duration: durationIn,
            easing: EASE_IN,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          // 回弹：popScale → 1，紧跟其后串行，只有 50ms
          Animated.timing(activeScale, {
            toValue: 1,
            duration: bounceDuration,
            easing: EASE_BOUNCE,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
        Animated.timing(activeOpacity, {
          toValue: 1,
          duration: durationIn,
          easing: EASE_IN,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(inactiveProgress, {
          toValue: 0,
          duration: durationOut,
          easing: EASE_OUT,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();
      return;
    }

    // 选中 → 未选中：只缩小 / 淡出，不弹
    Animated.parallel([
      Animated.timing(activeScale, {
        toValue: 0,
        duration: durationOut,
        easing: EASE_OUT,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(activeOpacity, {
        toValue: 0,
        duration: durationOut,
        easing: EASE_OUT,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(inactiveProgress, {
        toValue: 1,
        duration: durationOut,
        easing: EASE_IN,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, [
    selected,
    activeScale,
    activeOpacity,
    inactiveProgress,
    popScale,
    durationIn,
    bounceDuration,
    durationOut,
  ]);

  const activeStyle = {
    opacity: activeOpacity,
    transform: [{ scale: activeScale }],
  };
  const inactiveStyle = {
    opacity: inactiveProgress,
    transform: [{ scale: inactiveProgress }],
  };

  return (
    <Pressable
      testID={item.key}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={item.label}
      style={styles.item}
      onPress={() => onPress(item.key)}
    >
      <View style={styles.iconLayer}>
        <Animated.View style={styles.iconBox}>
          {/* 未选中态在下、选中态在上：切换时放大的一方盖住另一方 */}
          <Animated.View style={[styles.iconFrame, inactiveStyle]} pointerEvents="none">
            <QIcon name={item.icon} size={iconSize} color={inactiveColor} />
          </Animated.View>
          <Animated.View style={[styles.iconFrame, activeStyle]} pointerEvents="none">
            <QIcon name={item.activeIcon} size={iconSize} color={activeColor} />
          </Animated.View>
        </Animated.View>
      </View>

      {/* 文字不参与动画，只切颜色 */}
      <Text
        style={[styles.label, { color: selected ? activeColor : inactiveColor }]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

function QBottomTabImpl({
  items,
  value,
  defaultValue,
  onChange,
  theme: themeOverride,
  style,
  testID,
  accessibilityLabel,
}: QBottomTabProps) {
  /** 优先用组件自己的 `theme` prop（局部覆盖），否则跟随 `QThemeProvider`。 */
  const { theme } = useThemeConfig(themeOverride, 'bottomTab');
  const tokens = theme.components.bottomTab;
  const styles = bottomTabStylesOf(theme);

  /** 非受控内部状态：只在 `value` 未传时生效 */
  const [innerValue, setInnerValue] = useState(() => defaultValue ?? items[0]?.key ?? '');
  const selectedKey = value ?? innerValue;

  const handlePress = useCallback(
    (key: string) => {
      if (value === undefined) setInnerValue(key);
      onChange?.(key);
    },
    [value, onChange],
  );

  return (
    <Animated.View
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, style]}
    >
      {items.map((item) => (
        <BottomTabItemView
          key={item.key}
          item={item}
          selected={item.key === selectedKey}
          styles={styles}
          activeColor={tokens.colorActive}
          inactiveColor={tokens.colorInactive}
          iconSize={tokens.iconSize}
          popScale={tokens.popScale}
          durationIn={tokens.durationIn}
          bounceDuration={tokens.bounceDuration}
          durationOut={tokens.durationOut}
          onPress={handlePress}
        />
      ))}
    </Animated.View>
  );
}

/**
 * 底部标签栏。
 *
 * 高度 46 = 8（顶部间距）+ 24（icon）+ 14（文字）；选中态 / 未选中态图标同时渲染，
 * 用 `opacity` + `scale` 交叉切换（选中 icon 走 `0 → 1.2 → 1.2 → 1`）；文字只换色不动画。
 *
 * 用 `memo` 包裹，理由同 `QButton`。
 */
export const QBottomTab = memo(QBottomTabImpl);

// memo 包裹后 DevTools / 报错信息里显示的是内部函数名，改回对外名。
QBottomTab.displayName = 'QBottomTab';
