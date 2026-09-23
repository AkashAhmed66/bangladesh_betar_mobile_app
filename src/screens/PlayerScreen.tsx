import React from 'react';
import {FlatList, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import Slider from '@react-native-community/slider';
import {Pause, Play, SkipBack, SkipForward} from 'lucide-react-native';
import {usePlayer} from '../stores/player';
import {mediaUrl} from '../lib/api';
import {useTheme} from '../components/ui';

export default function PlayerScreen() {
  const colors = useTheme();
  const player = usePlayer();
  const track = player.queue[player.index];
  if (!track) return <View style={[styles.root, {backgroundColor: colors.bg}]}><Text style={[styles.heading, {color: colors.text}]}>Now playing</Text><Text style={{color: colors.muted}}>Nothing playing</Text></View>;
  return <View style={[styles.root, {backgroundColor: colors.bg}]}>
    <Text style={[styles.heading, {color: colors.text}]}>Now playing</Text>
    <Image source={mediaUrl(track.artworkUrl) ? {uri: mediaUrl(track.artworkUrl)!} : undefined} style={[styles.art, {backgroundColor: colors.elevated}]} />
    <Text style={[styles.title, {color: colors.text}]} numberOfLines={2}>{track.title}</Text>
    <Text style={[styles.sub, {color: colors.muted}]} numberOfLines={1}>{track.subtitle}</Text>
    {player.ad ? <View style={[styles.ad, {backgroundColor: colors.elevated}]}><Text style={[styles.adText, {color: colors.premium}]}>Sponsored message · {player.adRemaining}s</Text></View> : null}
    <Slider minimumValue={0} maximumValue={Math.max(player.duration, 1)} value={player.position} disabled={!!player.ad} minimumTrackTintColor={colors.accent} maximumTrackTintColor={colors.borderStrong} thumbTintColor={colors.accent} onSlidingComplete={value => player.seek(value)} />
    <View style={styles.times}><Text style={[styles.sub, {color: colors.muted}]}>{Math.floor(player.position)}s</Text><Text style={[styles.sub, {color: colors.muted}]}>{Math.floor(player.duration)}s</Text></View>
    <View style={styles.controls}><Pressable onPress={player.prev} accessibilityRole="button" accessibilityLabel="Previous track" hitSlop={8}><SkipBack size={28} color={colors.text} /></Pressable><Pressable onPress={player.toggle} accessibilityRole="button" accessibilityLabel={player.status === 'playing' ? 'Pause' : 'Play'} style={[styles.playButton, {backgroundColor: colors.accent}]}>{player.status === 'playing' ? <Pause size={24} color={colors.accentForeground} fill={colors.accentForeground} /> : <Play size={24} color={colors.accentForeground} fill={colors.accentForeground} />}</Pressable><Pressable onPress={() => player.next(true)} accessibilityRole="button" accessibilityLabel="Next track" hitSlop={8}><SkipForward size={28} color={colors.text} /></Pressable></View>
    <View style={styles.options}><Pressable onPress={player.toggleShuffle}><Text style={[styles.option, {color: player.shuffle ? colors.accent : colors.muted}]}>Shuffle</Text></Pressable><Pressable onPress={player.cycleRepeat}><Text style={[styles.option, {color: player.repeat !== 'off' ? colors.accent : colors.muted}]}>Repeat {player.repeat}</Text></Pressable><Pressable onPress={player.toggleMute}><Text style={[styles.option, {color: colors.muted}]}>{player.muted ? 'Unmute' : 'Mute'}</Text></Pressable></View>
    <Text style={[styles.queueTitle, {color: colors.text}]}>Queue · {player.queue.length}</Text>
    <FlatList data={player.queue} keyExtractor={item => item.key} renderItem={({item, index}) => <Pressable style={[styles.row, index === player.index && {backgroundColor: colors.elevated}]} onPress={() => player.jumpTo(index)}><Text style={[styles.rowTitle, {color: colors.text}]} numberOfLines={1}>{item.title}</Text><Text style={[styles.rowSub, {color: colors.muted}]} numberOfLines={1}>{item.subtitle}</Text></Pressable>} />
  </View>;
}

const styles = StyleSheet.create({
  root: {flex: 1, padding: 22}, heading: {fontSize: 28, fontWeight: '800', marginBottom: 20}, art: {width: '100%', aspectRatio: 1, borderRadius: 16}, title: {fontWeight: '800', fontSize: 22, marginTop: 16}, sub: {marginTop: 4}, ad: {padding: 8, borderRadius: 8, marginTop: 12}, adText: {textAlign: 'center', fontSize: 12, fontWeight: '700'}, times: {flexDirection: 'row', justifyContent: 'space-between'}, controls: {flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginVertical: 10}, icon: {fontSize: 42}, playButton: {width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center'}, options: {flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8}, option: {fontSize: 12}, queueTitle: {fontSize: 18, fontWeight: '700', marginBottom: 8}, row: {padding: 12, borderRadius: 9, marginBottom: 8}, rowTitle: {fontWeight: '700'}, rowSub: {marginTop: 3, fontSize: 12},
});
