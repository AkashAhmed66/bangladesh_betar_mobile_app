import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLive } from '../stores/live';
export function LiveExperience({ channelId, title }: { channelId: number; title: string }) {
  const live = useLive();
  React.useEffect(() => { void live.connect(channelId, title); return () => live.disconnect(); }, [channelId]);
  return <View style={styles.root}><Text style={styles.live}>{live.status === 'live' ? '● LIVE' : live.status.toUpperCase()}</Text><Text style={styles.title}>{title}</Text><Pressable style={styles.button} onPress={live.toggleMute}><Text style={styles.buttonText}>{live.muted ? 'Unmute' : 'Mute'}</Text></Pressable>{live.canSpeak ? <Pressable style={styles.button} onPress={() => live.setMic(!live.micOn)}><Text style={styles.buttonText}>{live.micOn ? 'Mute microphone' : 'Speak'}</Text></Pressable> : null}</View>;
}
const styles = StyleSheet.create({ root: { padding: 20, borderRadius: 16, backgroundColor: '#111c31' }, live: { color: '#f87171', fontWeight: '800' }, title: { color: '#fff', fontSize: 20, marginVertical: 10 }, button: { padding: 12, borderRadius: 10, backgroundColor: '#243b63', marginTop: 8 }, buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' } });
export default LiveExperience;
