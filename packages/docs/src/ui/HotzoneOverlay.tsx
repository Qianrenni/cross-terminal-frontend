import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/** 一个可视化框。 */
interface Box {
  /** `pressable` = 可点元素自身；`hotzone` = 向外扩展的热区层 */
  kind: 'pressable' | 'hotzone';
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * 热区调试覆盖层。
 *
 * 打开开关后，在预览区上画出：
 * - **蓝色虚线框** = 能被点击的元素自身（`[role="button"]`，如 `QButton` / 带 `onPress` 的 `QIcon`）；
 * - **橙色虚框 + 填充** = 超出元素边界的**外扩热区**（`QHotzone` 那个绝对定位的扩展层）。
 *
 * 每帧测量一次（只在结果变化时才 setState），所以改 `inset`、切主题、改窗口大小都会实时跟上。
 * 覆盖层 `pointer-events: none`，不影响点击。
 *
 * 用法：**只在开启时挂载**（`{hotzone && <HotzoneOverlay containerRef={ref} />}`），
 * 所以组件内部不需要 `active` 开关，也就不存在「在 effect 里清空 state」这种反模式。
 */
export function HotzoneOverlay({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const [boxes, setBoxes] = useState<Box[]>([]);

  useEffect(() => {
    let frame = 0;
    let lastSignature = '';

    const tick = () => {
      const root = containerRef.current;
      if (root != null) {
        const base = root.getBoundingClientRect();
        const next = collect(root, base);
        const signature = JSON.stringify(next);
        // 只在测量结果变化时才 setState，避免每帧重渲染
        if (signature !== lastSignature) {
          lastSignature = signature;
          setBoxes(next);
        }
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [containerRef]);

  return (
    <div className="hotzone" aria-hidden>
      {boxes.map((box) => (
        <div
          key={`${box.kind}-${box.left}-${box.top}-${box.width}-${box.height}`}
          className={`hotzone__box hotzone__box--${box.kind}`}
          style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
        >
          <span className="hotzone__tag">
            {Math.round(box.width)}×{Math.round(box.height)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * 测量容器内所有可点元素，以及它们**超出自身边界**的绝对定位子层（热区）。
 *
 * 只认 `position: absolute` 且确实向外扩的子元素 ——
 * `QButton` 的描边线框也是绝对定位，但它和父元素一样大，不会被当成热区。
 */
function collect(root: HTMLElement, base: DOMRect): Box[] {
  const boxes: Box[] = [];

  root.querySelectorAll<HTMLElement>('[role="button"]').forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    boxes.push({
      kind: 'pressable',
      left: rect.left - base.left,
      top: rect.top - base.top,
      width: rect.width,
      height: rect.height,
    });

    Array.from(element.children).forEach((child) => {
      const node = child as HTMLElement;
      if (getComputedStyle(node).position !== 'absolute') return;

      const layer = node.getBoundingClientRect();
      const extendsOut =
        layer.left < rect.left - 0.5 ||
        layer.top < rect.top - 0.5 ||
        layer.right > rect.right + 0.5 ||
        layer.bottom > rect.bottom + 0.5;
      if (!extendsOut) return;

      boxes.push({
        kind: 'hotzone',
        left: layer.left - base.left,
        top: layer.top - base.top,
        width: layer.width,
        height: layer.height,
      });
    });
  });

  return boxes;
}
