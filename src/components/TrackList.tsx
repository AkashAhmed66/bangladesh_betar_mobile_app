import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {PlayerTrack} from '../stores/player';
import {Artwork, Label, useTheme} from './ui';
import {usePlayer} from '../stores/player';
import {formatDuration} from '../lib/format';
import {useResponsiveLayout} from '../lib/responsive';
export default function TrackList({tracks}: {tracks: PlayerTrack[]}) { const colors = useTheme(); const play = usePlayer(s => s.playTrack); const layout = useResponsiveLayout(); return <View>{tracks.map(item => <Pressable key={item.key} onPress={() => play(item)} style={[styles.row, {borderBottomColor: colors.border}]}><Artwork uri={item.artworkUrl} size={layout.compact ? 44 : 48}/><View style={{flex: 1, minWidth: 0}}><Text numberOfLines={1} style={[styles.title, {color: colors.text}]}>{item.title}</Text><Label muted>{item.subtitle}</Label></View><Label muted>{formatDuration(item.duration)}</Label></Pressable>)}</View>; }
const styles = StyleSheet.create({row: {minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth}, title: {fontWeight: '800', fontSize: 14}});
