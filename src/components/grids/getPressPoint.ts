import { LayoutRectangle, NativeSyntheticEvent, GestureResponderEvent } from 'react-native';

type E = GestureResponderEvent | NativeSyntheticEvent<any> | undefined;

export function getPressPoint(e: E, fallback: LayoutRectangle | null) {
  const x = e?.nativeEvent?.pageX;
  const y = e?.nativeEvent?.pageY;

  if (typeof x === 'number' && typeof y === 'number') {
    return { x, y };
  }

  if (fallback) {
    return {
      x: fallback.x + fallback.width / 2,
      y: fallback.y + fallback.height / 2
    };
  }

  return null;
}