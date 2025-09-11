import { useFont } from '@/contexts/FontContext';
import { TextStyle } from 'react-native';

export function useFontStyle(baseStyle?: TextStyle): TextStyle {
  const { getFontFamily } = useFont();
  
  return {
    ...baseStyle,
    fontFamily: getFontFamily(),
  };
}
