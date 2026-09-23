import {useMemo} from 'react';
import {useWindowDimensions, type ViewStyle} from 'react-native';

/** Shared breakpoints from the public web shell, adapted to native width. */
export function useResponsiveLayout() {
  const {width, height} = useWindowDimensions();
  return useMemo(() => {
    const compact = width < 640;
    const tablet = width >= 640 && width < 1024;
    const wide = width >= 1024;
    const gutter = compact ? 16 : tablet ? 28 : 40;
    const contentWidth = Math.min(width, 1540);
    const columns = compact ? 1 : tablet ? 2 : 4;
    const cardGap = compact ? 12 : tablet ? 16 : 20;
    const cardWidth = Math.max(0, (contentWidth - gutter * 2 - cardGap * (columns - 1)) / columns);
    const fontScale = compact ? 0.92 : tablet ? 0.98 : 1;
    const pageStyle: ViewStyle = {
      width: '100%',
      maxWidth: 1540,
      alignSelf: 'center',
      paddingHorizontal: gutter,
    };
    return {width, height, contentWidth, gutter, columns, compact, tablet, wide, fontScale, cardGap, cardWidth, pageStyle};
  }, [width, height]);
}

export type ResponsiveLayout = ReturnType<typeof useResponsiveLayout>;
