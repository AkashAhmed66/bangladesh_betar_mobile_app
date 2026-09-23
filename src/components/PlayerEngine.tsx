import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Video, {type OnLoadData, type OnProgressData} from 'react-native-video';
import {registerPlayerEngine, notifyPlayerEnd, notifyPlayerError, notifyPlayerProgress, usePlayer} from '../stores/player';
import {mediaUrl} from '../lib/api';

/** Mount once near the app root so audio continues while screens change. */
export function PlayerEngine() {
  const ref = useRef<any>(null);
  const positionRef = useRef(0);
  const [paused, setPaused] = useState(false);
  const stream = usePlayer(s => s.stream);
  const ad = usePlayer(s => s.ad);
  const position = usePlayer(s => s.position);
  const volume = usePlayer(s => s.muted ? 0 : s.volume);
  const uri = mediaUrl(ad?.audio_url || stream?.stream.url);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    registerPlayerEngine({
      play: () => setPaused(false),
      pause: () => setPaused(true),
      seek: seconds => ref.current?.seek(Math.max(0, seconds)),
      // Volume is controlled by the reactive `volume` prop below. Keeping the
      // method in the engine contract lets the store control native playback
      // without reaching into this component.
      setVolume: () => undefined,
    });
    return () => registerPlayerEngine(null);
  }, []);

  useEffect(() => {
    // A source switch must be treated as a fresh native item. The store has
    // already reset `position` for the selected queue entry; onLoad below
    // applies that value once the native player is ready.
    if (!uri) setPaused(true);
  }, [uri]);

  if (!uri) return null;

  const onLoad = (data: OnLoadData) => {
    const duration = Number(data.duration) || 0;
    const resume = Math.max(0, positionRef.current);
    if (resume > 0.25) ref.current?.seek(resume);
    notifyPlayerProgress(resume, duration);
  };

  const onProgress = (data: OnProgressData) => {
    const duration = Number(data.seekableDuration || data.playableDuration) || undefined;
    notifyPlayerProgress(Number(data.currentTime) || 0, duration);
  };

  const onError = () => {
    setPaused(true);
    notifyPlayerError();
  };

  return (
    <View pointerEvents="none" style={styles.host}>
      <Video
        ref={ref}
        source={{uri}}
        paused={paused}
        volume={volume}
        playInBackground
        playWhenInactive
        ignoreSilentSwitch="ignore"
        onProgress={onProgress}
        onLoad={onLoad}
        onEnd={notifyPlayerEnd}
        onError={onError}
      />
    </View>
  );
}

const styles = StyleSheet.create({host: {position: 'absolute', width: 1, height: 1, opacity: 0}});

export default PlayerEngine;
