import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import type { ListRenderItem } from 'react-native';
import {
  QButton,
  QIcon,
  useQTheme,
  type IconName,
  type QButtonProps,
  type ThemeName,
} from '@cross-terminal/components';

/** 一行 = 图标 + 双行文字 + 按钮，接近真实业务列表。 */
interface BenchRow {
  id: number;
  text: string;
  subText: string;
  type: NonNullable<QButtonProps['type']>;
  level: NonNullable<QButtonProps['level']>;
  icon: IconName;
}

/** 变体轮换：三种 type × 三档 level（每 9 行一轮）。 */
const TYPES: NonNullable<QButtonProps['type']>[] = ['primary', 'secondary', 'tertiary'];
const LEVELS: NonNullable<QButtonProps['level']>[] = [6, 4, 1];
const ICONS: IconName[] = ['star', 'caret-right', 'check'];

/** 稳定的空回调：避免每次渲染新建函数导致 `QButton` 的 memo 失效。 */
const noop = () => {};

/** 行高固定，`getItemLayout` 才能可靠计算偏移。 */
const ROW_HEIGHT = 48;

/** 渲染模式：虚拟长列表 / 全量渲染。 */
type RenderMode = 'virtual' | 'full';

/** 列表项（模块级，避免每次渲染新建组件导致 FlatList 重新挂载）。 */
const renderItem: ListRenderItem<BenchRow> = ({ item }) => <BenchItem row={item} />;
const keyExtractor = (row: BenchRow) => String(row.id);
const getItemLayout = (_data: ArrayLike<BenchRow> | null | undefined, index: number) => ({
  length: ROW_HEIGHT,
  offset: ROW_HEIGHT * index,
  index,
});

/** 生成压测数据（确定性，保证每次测量可比）。 */
function buildRows(count: number): BenchRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    text: `按钮 ${index + 1}`,
    subText: index % 3 === 0 ? '副文案' : '',
    type: TYPES[index % TYPES.length],
    level: LEVELS[index % LEVELS.length],
    icon: ICONS[index % ICONS.length],
  }));
}

/** 测量结果（毫秒）。 */
interface Metrics {
  mountWall?: number;
  updateWall?: number;
  updateCommits?: number;
  themeWall?: number;
  themeCommits?: number;
  scaleWall?: number;
  scaleCommits?: number;
  renderedRows?: number;
  domNodes?: number;
  fps?: number;
  p95Frame?: number;
  droppedFrames?: number;
  heapMB?: number;
}

/** 等两帧：保证测量包含「提交 + 浏览器绘制」。 */
function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    requestAnimationFrame(() => requestAnimationFrame(finish));
    // 后台标签页会暂停 rAF：兜底，避免按钮看起来“没反应”（此时数字不作数）
    setTimeout(finish, 1000);
  });
}

function countDomNodes(): number {
  return typeof document === 'undefined' ? 0 : document.querySelectorAll('*').length;
}

/** 当前真正渲染在 DOM 里的行数（虚拟列表只渲染窗口内的行）。 */
function countRenderedRows(): number {
  return typeof document === 'undefined'
    ? 0
    : document.querySelectorAll('[data-testid="bench-row"]').length;
}

function readHeapMB(): number | undefined {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return memory == null ? undefined : Math.round((memory.usedJSHeapSize / 1024 / 1024) * 10) / 10;
}

const COUNT_OPTIONS = [200, 500, 1000, 3000];

/**
 * 性能压测页（`#/bench`）。
 *
 * 只用于**生产构建**下的基线测量：dev 模式有 HMR / 未压缩 / StrictMode，数字没有参考价值。
 *
 * 覆盖场景：首次挂载、单行更新、切主题、切大屏换算、滚动帧率、DOM / 堆内存。
 * 热区 overlay 不在本页渲染，避免 `querySelectorAll` 干扰测量。
 */
export function BenchPage({
  largeScreen,
  onLargeScreenChange,
}: {
  largeScreen: boolean;
  onLargeScreenChange: (next: boolean) => void;
}) {
  const { theme, setTheme } = useQTheme();
  const themeName = theme.themeName;
  const [count, setCount] = useState(1000);
  const [mode, setMode] = useState<RenderMode>('virtual');
  const [rows, setRows] = useState<BenchRow[]>([]);
  const [runId, setRunId] = useState(0);
  const [metrics, setMetrics] = useState<Metrics>({});

  /** 网格子树的 commit 次数（effect 在每次提交后 +1）。 */
  const commitCountRef = useRef(0);

  const clear = useCallback(() => {
    setRows([]);
    setMetrics({});
    commitCountRef.current = 0;
  }, []);

  const runMount = useCallback(async () => {
    // 先卸载旧内容再挂新的：
    // ① 旧 / 新两棵子树不会同时占内存（3000 行时峰值会翻倍，看起来就像“堆内存暴涨”）；
    // ② 下一次测量的真的是**挂载**，而不是同 key 的更新。
    if (rows.length > 0) {
      setRows([]);
      await nextPaint();
    }

    commitCountRef.current = 0;
    const start = performance.now();
    setRows(buildRows(count));
    setRunId((value) => value + 1);
    await nextPaint();

    setMetrics({
      mountWall: performance.now() - start,
      renderedRows: countRenderedRows(),
      domNodes: countDomNodes(),
      heapMB: readHeapMB(),
    });
  }, [count, rows.length]);

  const runUpdate = useCallback(async () => {
    commitCountRef.current = 0;
    const start = performance.now();
    // 只改第一行的 level：其余 `QButton` 应被 memo 挡住
    setRows((prev) =>
      prev.map((row, index) => (index === 0 ? { ...row, level: row.level === 6 ? 1 : 6 } : row)),
    );
    await nextPaint();

    setMetrics((prev) => ({
      ...prev,
      updateWall: performance.now() - start,
      updateCommits: commitCountRef.current,
    }));
  }, []);

  const runTheme = useCallback(async () => {
    commitCountRef.current = 0;
    const start = performance.now();
    setTheme((themeName === 'blue' ? 'yellow' : 'blue') as ThemeName);
    await nextPaint();

    setMetrics((prev) => ({
      ...prev,
      themeWall: performance.now() - start,
      themeCommits: commitCountRef.current,
    }));
  }, [setTheme, themeName]);

  const runScale = useCallback(async () => {
    commitCountRef.current = 0;
    const start = performance.now();
    onLargeScreenChange(!largeScreen);
    await nextPaint();

    setMetrics((prev) => ({
      ...prev,
      scaleWall: performance.now() - start,
      scaleCommits: commitCountRef.current,
    }));
  }, [largeScreen, onLargeScreenChange]);

  const runScroll = useCallback(async () => {
    const scroller = document.getElementById('bench-scroll');
    if (scroller == null) return;

    const frames: number[] = [];
    const start = performance.now();
    let last = start;

    await new Promise<void>((resolve) => {
      const tick = () => {
        const now = performance.now();
        frames.push(now - last);
        last = now;

        scroller.scrollTop += 24;
        if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
          scroller.scrollTop = 0;
        }

        if (now - start < 1500) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
      // 后台标签页 rAF 被暂停：兜底，避免按钮像卡死（此时帧率不作数）
      setTimeout(resolve, 2500);
    });

    const deltas = frames.slice(1);
    const elapsed = performance.now() - start;
    const sorted = [...deltas].sort((a, b) => a - b);

    setMetrics((prev) => ({
      ...prev,
      fps: Math.round((deltas.length / elapsed) * 1000),
      p95Frame: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
      droppedFrames: deltas.filter((delta) => delta > 20).length,
    }));
  }, []);

  const isProd = import.meta.env.PROD;

  return (
    <div className="bench">
      <div className="bench__head">
        <h1>性能压测</h1>
        <p className="bench__note">
          当前构建：<b>{isProd ? '生产构建' : '开发模式（数字不可用，仅验证功能）'}</b>
          ；窗口宽度：<code>{typeof window === 'undefined' ? '-' : window.innerWidth}px</code>；
          大屏换算：<code>{largeScreen ? '开' : '关'}</code>；主题：<code>{themeName}</code>
        </p>
      </div>

      <div className="bench__bar">
        <label className="bench__field">
          规模
          <select value={count} onChange={(event) => setCount(Number(event.target.value))}>
            {COUNT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} 行
              </option>
            ))}
          </select>
        </label>

        <label className="bench__field">
          渲染
          <select
            value={mode}
            onChange={(event) => {
              setMode(event.target.value as RenderMode);
              // 模式变了先清空，避免拿旧 DOM 测新配置
              setRows([]);
              setMetrics({});
            }}
          >
            <option value="virtual">虚拟列表（FlatList）</option>
            <option value="full">全量渲染</option>
          </select>
        </label>

        <button className="btn" type="button" onClick={runMount}>
          挂载 / 重挂载
        </button>
        <button
          className="btn btn--ghost"
          type="button"
          onClick={runUpdate}
          disabled={rows.length === 0}
        >
          改第一行 level
        </button>
        <button
          className="btn btn--ghost"
          type="button"
          onClick={runTheme}
          disabled={rows.length === 0}
        >
          切主题
        </button>
        <button
          className="btn btn--ghost"
          type="button"
          onClick={runScale}
          disabled={rows.length === 0}
        >
          切大屏换算
        </button>
        <button
          className="btn btn--ghost"
          type="button"
          onClick={runScroll}
          disabled={rows.length === 0}
        >
          滚动 1.5s
        </button>
        <button className="btn btn--ghost" type="button" onClick={clear}>
          清空
        </button>
      </div>

      <MetricGrid metrics={metrics} />

      {mode === 'virtual' ? (
        <div className="bench__viewport">
          <CommitProbe countRef={commitCountRef} />
          <FlatList
            key={runId}
            nativeID="bench-scroll"
            data={rows}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            updateCellsBatchingPeriod={50}
            windowSize={5}
            style={flatListStyle}
          />
        </div>
      ) : (
        <div id="bench-scroll" className="bench__scroll">
          <View key={runId} style={gridStyle}>
            <CommitProbe countRef={commitCountRef} />
            {rows.map((row) => (
              <BenchItem key={row.id} row={row} />
            ))}
          </View>
        </div>
      )}

      <p className="bench__hint">
        口径：wall 时间 = setState → 第二帧绘制完成（包含浏览器绘制）；commit 次数来自列表内的
        effect 探针，单行更新期望为 1。滚动为自动滚动 1.5s 的 rAF 采样，长帧阈值 20ms。
        <br />
        渲染：默认用 `FlatList` 虚拟列表（只渲染窗口内的行）；切到全量渲染可对比 DOM 节点 / 堆内存 /
        帧率的差异。
        <br />
        内存：重挂载会先卸载旧树再挂新树；JS 堆在未触发 GC
        前持续增长是正常的（大规模行本身就占内存）， 点「清空」后应回落到空页水平 ——
        若不回落才是泄漏。
      </p>
    </div>
  );
}

/**
 * 提交探针：不渲染任何节点，只在每次 commit 后把计数 +1。
 *
 * 为什么不用 `<Profiler>`：生产构建下 `actualDuration` 会被优化成 0，
 * 只有 dev / profiling 构建有值；而这个页面的数字必须以**生产构建**为准。
 */
function CommitProbe({ countRef }: { countRef: React.RefObject<number> }) {
  useEffect(() => {
    countRef.current += 1;
  });

  return null;
}

/** 单行：图标 + 双行文字 + 按钮。 */
function BenchItem({ row }: { row: BenchRow }) {
  return (
    <View testID="bench-row" style={rowStyle}>
      <QIcon name={row.icon} size={20} />
      <View style={textsStyle}>
        <Text style={titleStyle} numberOfLines={1}>
          {row.text}
        </Text>
        <Text style={subTitleStyle} numberOfLines={1}>
          {row.subText || ' '}
        </Text>
      </View>
      <QButton text={row.type} type={row.type} level={row.level} onPress={noop} />
    </View>
  );
}

const gridStyle = { flexDirection: 'column' } as const;
const flatListStyle = { flex: 1 } as const;
const rowStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  height: ROW_HEIGHT,
  paddingHorizontal: 8,
  borderBottomWidth: 1,
  borderBottomColor: '#eef0f4',
} as const;
const textsStyle = { flex: 1, minWidth: 0 } as const;
const titleStyle = { fontSize: 13, color: '#1f2328' } as const;
const subTitleStyle = { fontSize: 11, color: '#6b7280' } as const;

/** 指标卡片。 */
function MetricGrid({ metrics }: { metrics: Metrics }) {
  const items: { label: string; value: string; hint: string }[] = [
    {
      label: '挂载 wall',
      value: fmt(metrics.mountWall, 'ms'),
      hint: 'setState → 两帧绘制完成',
    },
    {
      label: '单行更新 wall',
      value: fmt(metrics.updateWall, 'ms'),
      hint: `${metrics.updateCommits ?? '-'} 次 commit（期望 1）`,
    },
    {
      label: '切主题 wall',
      value: fmt(metrics.themeWall, 'ms'),
      hint: `${metrics.themeCommits ?? '-'} 次 commit（全部消费者）`,
    },
    {
      label: '切大屏 wall',
      value: fmt(metrics.scaleWall, 'ms'),
      hint: `${metrics.scaleCommits ?? '-'} 次 commit`,
    },
    {
      label: '滚动帧率',
      value: metrics.fps == null ? '-' : `${metrics.fps} fps`,
      hint: `p95 帧 ${fmt(metrics.p95Frame, 'ms')} · 长帧 ${metrics.droppedFrames ?? '-'}`,
    },
    {
      label: '已渲染行',
      value: metrics.renderedRows == null ? '-' : `${metrics.renderedRows}`,
      hint: '虚拟列表应远小于总行数',
    },
    {
      label: 'DOM 节点',
      value: metrics.domNodes == null ? '-' : `${metrics.domNodes}`,
      hint: '含文档站外壳',
    },
    {
      label: 'JS 堆',
      value: metrics.heapMB == null ? '-' : `${metrics.heapMB} MB`,
      hint: '未触发 GC，会随分配增长；「清空」后回落',
    },
  ];

  return (
    <div className="bench__metrics">
      {items.map((item) => (
        <div className="bench__metric" key={item.label}>
          <span className="bench__metric-label">{item.label}</span>
          <b>{item.value}</b>
          <span className="bench__metric-hint">{item.hint}</span>
        </div>
      ))}
    </div>
  );
}

function fmt(value: number | undefined, unit: string): string {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${Math.round(value * 10) / 10} ${unit}`;
}
