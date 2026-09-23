import React, {useState} from 'react';
import {ActivityIndicator, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import Slider from '@react-native-community/slider';
import {Headphones, Pause, Play, SkipBack, SkipForward, X} from 'lucide-react-native';
import {usePlayer} from '../stores/player';
import {useNavigation} from '../navigation';
import {mediaUrl} from '../lib/api';
import {formatDuration} from '../lib/format';
import {useTheme} from './ui';

function PlaybackProgress({position, duration, disabled, onSeek}: {
  position: number;
  duration: number;
  disabled: boolean;
  onSeek: (seconds: number) => void;
}) {
  const colors = useTheme();
  const [scrubPosition, setScrubPosition] = useState<number | null>(null);
  const total = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const elapsed = Number.isFinite(position) ? Math.max(0, position) : 0;
  const displayedPosition = Math.min(scrubPosition ?? elapsed, total || elapsed);
  const seekDisabled = disabled || total === 0;

  return (
    <View style={styles.progress}>
      <Text style={[styles.time, {color: colors.secondary}]}>{formatDuration(displayedPosition)}</Text>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={total || 1}
        value={total > 0 ? displayedPosition : 0}
        disabled={seekDisabled}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.borderStrong}
        thumbTintColor={colors.accent}
        tapToSeek
        onSlidingStart={setScrubPosition}
        onValueChange={setScrubPosition}
        onSlidingComplete={value => {
          if (!seekDisabled) onSeek(value);
          setScrubPosition(null);
        }}
        accessibilityLabel="Playback progress"
        accessibilityValue={{min: 0, max: total || 1, now: total > 0 ? displayedPosition : 0, text: `${formatDuration(displayedPosition)} of ${total > 0 ? formatDuration(total) : 'unknown duration'}`}}
      />
      <Text style={[styles.time, {color: colors.secondary}]}>{total > 0 ? formatDuration(total) : '--:--'}</Text>
    </View>
  );
}

/** Persistent compact transport for the Listen portal. */
export function PlayerBar() {
  const {queue, index, status, position, duration, stream, ad, seek, toggle, next, prev, close} = usePlayer();
  const nav = useNavigation();
  const colors = useTheme();
  const track = queue[index];
  if (!track) return null;

  const artwork = mediaUrl(track.artworkUrl);
  const playing = status === 'playing';

  return (
    <View style={[styles.bar, {backgroundColor: colors.elevated, borderColor: colors.border}]}>
      <View style={styles.transport}>
      <Pressable
        onPress={() => nav.navigate('/player')}
        style={styles.identity}
        accessibilityRole="button"
        accessibilityLabel={`Open player for ${track.title}`}
        android_ripple={{color: colors.highlight}}
      >
        {artwork ? (
          <Image source={{uri: artwork}} style={[styles.art, {backgroundColor: colors.surface}]} />
        ) : (
          <View style={[styles.art, styles.placeholder, {backgroundColor: colors.surface}]}>
            <Headphones size={20} color={colors.muted} />
          </View>
        )}
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.title, {color: colors.text}]}>{track.title}</Text>
          <Text numberOfLines={1} style={[styles.sub, {color: colors.muted}]}>{track.subtitle}</Text>
        </View>
      </Pressable>

      <View style={styles.controls}>
        <Pressable onPress={prev} style={styles.control} hitSlop={6} accessibilityRole="button" accessibilityLabel="Previous track" android_ripple={{color: colors.highlight, borderless: true}}>
          <SkipBack size={20} color={colors.text} />
        </Pressable>
        <Pressable onPress={toggle} style={[styles.playControl, {backgroundColor: colors.accent}]} hitSlop={4} accessibilityRole="button" accessibilityLabel={playing ? 'Pause' : 'Play'} android_ripple={{color: colors.accentGlow, borderless: true}}>
          {status === 'loading' ? <ActivityIndicator size="small" color={colors.accentForeground} /> : playing ? <Pause size={18} color={colors.accentForeground} fill={colors.accentForeground} /> : <Play size={18} color={colors.accentForeground} fill={colors.accentForeground} />}
        </Pressable>
        <Pressable onPress={() => next(true)} style={styles.control} hitSlop={6} accessibilityRole="button" accessibilityLabel="Next track" android_ripple={{color: colors.highlight, borderless: true}}>
          <SkipForward size={20} color={colors.text} />
        </Pressable>
        <Pressable onPress={close} style={styles.control} hitSlop={6} accessibilityRole="button" accessibilityLabel="Close player" android_ripple={{color: colors.highlight, borderless: true}}>
          <X size={20} color={colors.muted} />
        </Pressable>
      </View>
      </View>
      <PlaybackProgress
        key={`${track.key}:${index}:${ad?.id ?? 'track'}:${status === 'loading'}`}
        position={position}
        duration={duration || track.duration || 0}
        disabled={!!ad || !stream || status === 'loading' || status === 'blocked'}
        onSeek={seek}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {marginHorizontal: 12, marginBottom: 8, padding: 8, borderRadius: 12, borderWidth: 1},
  transport: {minHeight: 48, flexDirection: 'row', alignItems: 'center'},
  progress: {flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingHorizontal: 2},
  slider: {flex: 1, minWidth: 0, height: 32, marginHorizontal: 4},
  time: {fontSize: 11, fontVariant: ['tabular-nums']},
  identity: {flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center'},
  art: {width: 48, height: 48, borderRadius: 6},
  placeholder: {alignItems: 'center', justifyContent: 'center'},
  copy: {flex: 1, minWidth: 0, marginHorizontal: 10},
  title: {fontWeight: '700'},
  sub: {fontSize: 12, marginTop: 3},
  controls: {flexDirection: 'row', alignItems: 'center', gap: 1},
  control: {width: 34, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20},
  playControl: {width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center'},
});

export default PlayerBar;
