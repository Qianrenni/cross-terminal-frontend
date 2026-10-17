import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { QHotzone } from '@/hotzone';
import { hotzoneCases } from './props/Hotzone.cases';

/**
 * 快照测试：把 `props/Hotzone.cases.ts` 里的每组 props 渲染出来，锁定结构与样式。
 *
 * 孩子固定 20×20 —— 热区尺寸都是相对它算的，换个尺寸快照就失去意义了。
 */
const CHILD = <View style={{ width: 20, height: 20 }} />;

describe('QHotzone 快照', () => {
  for (const { name, props } of hotzoneCases) {
    it(name, () => {
      expect(render(<QHotzone {...props}>{CHILD}</QHotzone>).toJSON()).toMatchSnapshot();
    });
  }
});
