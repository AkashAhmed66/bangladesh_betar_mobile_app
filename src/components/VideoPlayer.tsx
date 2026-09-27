import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Video, { OnProgressData, VideoRef } from 'react-native-video';
import Slider from '@react-native-community/slider';
import { Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from 'lucide-react-native';
import { useTheme } from './ui';
import { mediaUrl } from '../lib/api';

export interface VideoPlayerProps {
  src: string;
  title?: string;
  poster?: string | null;
  autoPlay?: boolean;
  compact?: boolean;
  fullScreen?: boolean;
  onEnd?: () => void;
}

function timeLabel(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '00:00';
  const seconds = Math.floor(value);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(
    2,
    '0',
  )}`;
}

/** Native equivalent of the web AdvancedVideoPlayer. Controls are deliberately
 * kept in the React Native layer so the player remains usable on both iOS and Android. */
export default function VideoPlayer({
  src,
  title,
  poster,
  autoPlay = false,
  compact = false,
  fullScreen = false,
  onEnd,
}: VideoPlayerProps) {
  const colors = useTheme();
  const ref = useRef<VideoRef>(null);
  const normalizedSrc = mediaUrl(typeof src === 'string' ? src.trim() : '') || '';
  const normalizedPoster = mediaUrl(poster);
  const [paused, setPaused] = useState(!autoPlay);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [rate, setRate] = useState(1);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setPaused(!autoPlay);
    setPosition(0);
    setDuration(0);
    setBuffering(Boolean(normalizedSrc));
    setHasError(false);
    setRate(1);
  }, [normalizedSrc, autoPlay]);

  const progress = (event: OnProgressData) => {
    if (Number.isFinite(event.currentTime)) setPosition(Math.max(0, event.currentTime));
  };
  const seek = (value: number) => {
    const target = Math.max(0, Math.min(value, duration || value));
    setPosition(target);
    if (normalizedSrc && duration > 0) ref.current?.seek(target);
  };

  if (!normalizedSrc) {
    return (
      <View style={[styles.root, compact && styles.compact, styles.empty]}>
        <Text style={styles.status}>Video unavailable</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        fullScreen ? styles.fullScreen : compact && styles.compact,
        { backgroundColor: '#000' },
      ]}
    >
      <Video
        key={`${src}:${reloadKey}`}
        ref={ref}
        source={{ uri: normalizedSrc }}
        poster={normalizedPoster || undefined}
        posterResizeMode="cover"
        paused={paused}
        muted={muted}
        rate={rate}
        controls={false}
        resizeMode="contain"
        playInBackground={false}
        playWhenInactive={false}
        onLoad={event => {
          setDuration(Number.isFinite(event.duration) ? Math.max(0, event.duration) : 0);
          setBuffering(false);
        }}
        onLoadStart={() => {
          setBuffering(true);
          setHasError(false);
        }}
        onProgress={progress}
        onBuffer={({ isBuffering }) => setBuffering(isBuffering)}
        onEnd={() => {
          setPaused(true);
          setPosition(duration > 0 ? duration : position);
          setBuffering(false);
          onEnd?.();
        }}
        onError={() => {
          setPaused(true);
          setBuffering(false);
          setHasError(true);
        }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        {title ? (
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        ) : null}
        {hasError ? (
          <View style={styles.errorBox}>
            <Text style={styles.status}>Video could not be played</Text>
            <Pressable onPress={() => { setHasError(false); setReloadKey(value => value + 1); }} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {buffering && !hasError ? <ActivityIndicator color="#fff" style={styles.loader} /> : null}
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Play video' : 'Pause video'}
            onPress={() => setPaused(value => !value)}
            style={styles.control}
          >
            {paused ? <Play size={17} color="#fff" fill="#fff" /> : <Pause size={17} color="#fff" fill="#fff" />}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rewind 10 seconds"
            onPress={() => seek(Math.max(0, position - 10))}
            style={styles.control}
          >
            <RotateCcw size={16} color="#fff" />
            <Text style={styles.controlSmall}>10</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Forward 10 seconds"
            onPress={() => seek(Math.min(duration, position + 10))}
            style={styles.control}
          >
            <RotateCw size={16} color="#fff" />
            <Text style={styles.controlSmall}>10</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={muted ? 'Unmute video' : 'Mute video'}
            onPress={() => setMuted(value => !value)}
            style={styles.control}
          >
            {muted ? <VolumeX size={17} color="#fff" /> : <Volume2 size={17} color="#fff" />}
          </Pressable>
          <Text style={styles.time}>
            {timeLabel(position)} / {timeLabel(duration)}
          </Text>
          <Pressable onPress={() => setRate(value => value >= 2 ? 0.5 : value + 0.25)} style={styles.speed}>
            <Text style={styles.controlText}>{rate}x</Text>
          </Pressable>
        </View>
        <Slider
          value={position}
          minimumValue={0}
          maximumValue={Math.max(duration, 0.1)}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor="rgba(255,255,255,.4)"
          thumbTintColor="#fff"
          onSlidingComplete={seek}
          style={styles.slider}
          accessibilityLabel="Seek video"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden' },
  compact: { aspectRatio: 16 / 10 },
  fullScreen: { flex: 1, width: '100%', height: '100%', aspectRatio: undefined },
  empty: { alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,.12)',
  },
  title: { color: '#fff', fontWeight: '700', marginBottom: 5 },
  status: { color: '#fff', fontSize: 12, alignSelf: 'center', marginBottom: 8 },
  loader: { marginBottom: 10 },
  errorBox: { alignSelf: 'center', alignItems: 'center', marginBottom: 10, padding: 12, borderRadius: 10, backgroundColor: 'rgba(0,0,0,.75)' },
  retryButton: { marginTop: 8, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fff' },
  retryText: { color: '#000', fontSize: 12, fontWeight: '800' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  control: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,.6)',
  },
  controlText: { color: '#fff', fontSize: 14 },
  controlSmall: { color: '#fff', fontSize: 9, marginLeft: -3 },
  time: { color: '#fff', fontSize: 11, marginLeft: 4 },
  speed: { marginLeft: 'auto', borderRadius: 13, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,.6)' },
  slider: { height: 26, width: '100%' },
});
