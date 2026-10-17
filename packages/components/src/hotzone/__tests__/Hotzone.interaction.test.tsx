import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { QHotzone, hotzoneLayerStyle } from '@/hotzone';

const noop = () => undefined;

/** 20×20 的固定内容 —— 所有热区尺寸都是从它算出来的。 */
const child = () => <View testID="content" style={{ width: 20, height: 20 }} />;

/**
 * RNTL 测试节点的类型。
 *
 * 从 `render()` 的返回值推导，**不直接** `import type ... from 'react-test-renderer'` ——
 * 那个包没带 `.d.ts`（也没装 `@types/react-test-renderer`），直接引会报 TS7016。
 */
type TestNode = ReturnType<typeof render>['UNSAFE_root'];

/**
 * 在渲染树里找触控层（唯一一个 `position: absolute` 的节点）。
 *
 * ⚠️ 不能靠 `content.parent.children` 找：react-test-renderer 的 `.parent` / `.children`
 * 会把 **composite / forwardRef** 也当成节点，内容和触控层在这条链上并不是同一个父节点，
 * 直接比 `parent` 会得到错误结论。改成从根节点整棵树找，和层级无关。
 */
function findLayerSibling(content: TestNode): TestNode | undefined {
  let root: TestNode = content;
  while (root.parent) root = root.parent;

  let found: TestNode | undefined;
  const visit = (node: TestNode) => {
    if (found) return;
    if (node !== content && StyleSheet.flatten(node.props?.style)?.position === 'absolute') {
      found = node;
      return;
    }
    for (const child of node.children) if (typeof child !== 'string') visit(child);
  };
  visit(root);

  return found;
}

/** `toJSON()` 的节点形状（只有 host 节点，没有 composite/forwardRef 中间层）。 */
type JsonNode = {
  props: { style?: StyleProp<ViewStyle> };
  children: (JsonNode | string)[] | null;
};

describe('QHotzone 交互', () => {
  it('内容不在绝对定位区域内部，且触控层渲染在内容之前', () => {
    // 这就是「内容照常布局 + 绝对定位触控层」相对「内容放进绝对盒子」的核心保证
    const result = render(
      <QHotzone onPress={noop} inset={12}>
        {child()}
      </QHotzone>,
    );
    const content = result.getByTestId('content');
    const layer = findLayerSibling(content);

    expect(layer).toBeTruthy();

    // ① 层级无关的判定：从内容往上走，不应该遇到触控层
    let cursor: TestNode | null = content.parent;
    while (cursor) {
      expect(cursor).not.toBe(layer);
      cursor = cursor.parent;
    }

    // ② 顺序（用只含 host 节点的 toJSON 树）：触控层在前，内容在后
    const children = (result.toJSON() as unknown as JsonNode).children ?? [];
    expect(children).toHaveLength(2);
    expect(StyleSheet.flatten((children[0] as JsonNode).props.style)).toEqual(
      hotzoneLayerStyle(12),
    );
    expect(StyleSheet.flatten((children[1] as JsonNode).props.style)).toEqual({
      width: 20,
      height: 20,
    });
  });

  it('显式 inset：触控层四边取负值向外扩', () => {
    const { getByTestId } = render(
      <QHotzone onPress={noop} inset={12}>
        {child()}
      </QHotzone>,
    );

    expect(StyleSheet.flatten(findLayerSibling(getByTestId('content'))?.props.style)).toEqual(
      hotzoneLayerStyle(12),
    );
  });

  it('点内容会冒泡到 Pressable，触发 onPress', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <QHotzone onPress={onPress} inset={12}>
        {child()}
      </QHotzone>,
    );

    fireEvent.press(getByTestId('content'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('不做任何测量：没有 onLayout，渲染结果只由 inset 决定', () => {
    const { getByTestId } = render(
      <QHotzone onPress={noop} inset={12} testID="hz">
        {child()}
      </QHotzone>,
    );

    // 没有 onLayout ⇒ 代码里不存在「测量内容尺寸」这条路，
    // 也就没有首帧无热区、setState 抖动这些问题。
    expect(getByTestId('hz').props.onLayout).toBeUndefined();
  });

  it('disabled：不触发 onPress，并声明给读屏软件', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <QHotzone onPress={onPress} inset={12} disabled testID="hz">
        {child()}
      </QHotzone>,
    );

    expect(getByTestId('hz').props.accessibilityState).toEqual({ disabled: true });

    fireEvent.press(getByTestId('content'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('无障碍：角色是 button，标签可覆盖', () => {
    const { getByTestId } = render(
      <QHotzone onPress={noop} inset={12} testID="hz" accessibilityLabel="关闭弹窗">
        {child()}
      </QHotzone>,
    );

    expect(getByTestId('hz').props.accessibilityRole).toBe('button');
    expect(getByTestId('hz').props.accessibilityLabel).toBe('关闭弹窗');
  });
});
