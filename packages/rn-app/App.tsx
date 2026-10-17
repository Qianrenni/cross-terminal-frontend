import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  DEFAULT_THEME_NAME,
  QButton,
  QThemeProvider,
  THEME_NAMES,
  useQTheme,
} from '@cross-terminal/components';

/**
 * 容器通过 `initialProperties` 注入的字段（对应原生侧 HybridPageSpec.toInitialProps）。
 */
export interface ContainerProps {
  /** 容器路由，如 /rn/demo */
  route?: string;
  /** 页面包标识 */
  appKey?: string;
  /** 当前生效的包版本号（OTA 后应随之变化） */
  versionCode?: number;
  /** 是否深色主题 */
  dark?: boolean;
}

/**
 * 构建标记：**每次发版改这个值**，用于肉眼确认 OTA 是否真的生效。
 * 例如改成 'build-2'，发布后重进页面应显示新值。
 */
const BUILD_MARKER = 'build-1';

export default function App(props: ContainerProps) {
  return (
    <QThemeProvider theme={DEFAULT_THEME_NAME}>
      <Content {...props} />
    </QThemeProvider>
  );
}

/**
 * 页面内容。
 *
 * 主题切换按钮演示的是**运行时能力**：`setTheme()` 之后当前子树立刻换色，
 * 不需要重挂载，也不需要重启容器。
 */
function Content(props: ContainerProps) {
  const { theme, setTheme } = useQTheme();
  const [count, setCount] = useState(0);
  const dark = props.dark ?? false;

  const palette = dark ? darkPalette : lightPalette;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: palette.fg }]}>跨端容器 · RN 页面</Text>
        <Text style={[styles.marker, { color: palette.accent }]}>构建标记：{BUILD_MARKER}</Text>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Row label="路由 route" value={props.route ?? '(未注入)'} palette={palette} />
          <Row label="包标识 appKey" value={props.appKey ?? '(未注入)'} palette={palette} />
          <Row
            label="包版本 versionCode"
            value={props.versionCode != null ? String(props.versionCode) : '(未注入)'}
            palette={palette}
          />
          <Row label="主题 dark" value={String(dark)} palette={palette} />
        </View>

        <QButton
          type="primary"
          level={6}
          text={`点击计数：${count}`}
          onPress={() => setCount((c) => c + 1)}
        />

        <QButton
          type="secondary"
          level={4}
          text="次要按钮"
          subText="双行副文案示例"
          onPress={() => setCount(0)}
        />

        <QButton type="tertiary" text="加载中（不可点）" loading />

        <Text style={[styles.hint, { color: palette.muted }]}>
          当前主题：{theme.themeName}（改一行代码 → 构建 Bundle → 上传发布 →
          冷启动生效，全程无需重装 APK）
        </Text>

        <View style={styles.themeRow}>
          {THEME_NAMES.map((name) => (
            <QButton
              key={name}
              level={1}
              type={theme.themeName === name ? 'primary' : 'tertiary'}
              text={name}
              onPress={() => setTheme(name)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, palette }: { label: string; value: string; palette: Palette }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: palette.fg }]}>{value}</Text>
    </View>
  );
}

interface Palette {
  bg: string;
  card: string;
  border: string;
  fg: string;
  muted: string;
  accent: string;
}

const lightPalette: Palette = {
  bg: '#ffffff',
  card: '#f6f7f9',
  border: '#e3e6ea',
  fg: '#14181f',
  muted: '#6b7280',
  accent: '#2563eb',
};

const darkPalette: Palette = {
  bg: '#0f1115',
  card: '#181b21',
  border: '#2a2f38',
  fg: '#e9edf3',
  muted: '#8b93a1',
  accent: '#60a5fa',
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 20, fontWeight: '600' },
  marker: { fontSize: 13, fontWeight: '600' },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '500' },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
