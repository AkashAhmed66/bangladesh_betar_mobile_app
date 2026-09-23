import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import type {CatalogueItem} from '../lib/types';
import {displayTitle, typeLabel} from '../lib/format';
import {useNavigation} from '../navigation';
import {Artwork, Label, useTheme} from './ui';
import {toTrack} from '../lib/tracks';
import {usePlayer} from '../stores/player';
import {useResponsiveLayout} from '../lib/responsive';

export default function MediaCard({item, compact = false, width: requestedWidth, grid = false}: {item: CatalogueItem; compact?: boolean; width?: number; grid?: boolean}) {
  const nav = useNavigation(); const colors = useTheme(); const play = usePlayer(s => s.playTrack);
  const layout = useResponsiveLayout();
  const uri = 'artwork_url' in item ? item.artwork_url : item.type === 'artist' ? item.photo_url : null;
  const title = displayTitle(item, 'en'); const track = toTrack(item);
  const itemType = (item as unknown as {type: string}).type;
  const route = itemType === 'audio_asset' ? 'assets' : itemType === 'podcast_channel' ? 'podcasts' : itemType === 'audio_book' ? 'audiobooks' : itemType === 'watch_show' ? 'watch' : `${itemType}s`;
  const cardWidth = requestedWidth ?? (compact ? (layout.compact ? Math.min(156, layout.width * .42) : 176) : layout.cardWidth);
  const imageSize = Math.max(112, cardWidth);
  // Shelf cards keep a trailing gutter for horizontal scrolling. Grid cards
  // get their spacing from the parent row, so that gutter must be removed or
  // two columns can wrap into a single column on smaller screens.
  return <Pressable onPress={() => { if (track) play(track); else nav.navigate(`/${route}/${item.id}`); }} style={[styles.card, grid && styles.gridCard, {width: cardWidth}]} accessibilityRole="button">
    <Artwork uri={uri} size={imageSize} /><Text numberOfLines={2} style={[styles.title, {color: colors.text}]}>{title}</Text><Label muted>{typeLabel(item.type)}</Label>
  </Pressable>;
}
const styles = StyleSheet.create({card: {marginRight: 12}, gridCard: {marginRight: 0, marginBottom: 4}, title: {fontSize: 14, fontWeight: '800', marginTop: 8, lineHeight: 18},});
