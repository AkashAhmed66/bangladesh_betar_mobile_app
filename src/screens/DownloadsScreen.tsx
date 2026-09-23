import React, {useEffect} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useDownloads, offlineToTrack} from '../stores/downloads';
import {usePlayer} from '../stores/player';
import {mediaUrl} from '../lib/api';
import {Heading, Label, Screen, useTheme} from '../components/ui';

export default function DownloadsScreen() {
  const colors = useTheme();
  const downloads = useDownloads();
  const play = usePlayer(state => state.playTrack);
  useEffect(() => { void downloads.hydrate(); }, [downloads.hydrate]);
  const records = Object.values(downloads.records);
  return <Screen>
    <Heading>Downloads</Heading>
    <Label muted>Saved recordings available for offline listening.</Label>
    {!records.length ? <View style={styles.empty}><Label muted>No recordings saved for offline listening.</Label></View> : <ScrollView scrollEnabled={false} contentContainerStyle={styles.list}>
      {records.map(item => <View key={String(item.assetId)} style={[styles.row, {borderBottomColor: colors.border}]}>
        <Image source={mediaUrl(item.artworkUrl) ? {uri: mediaUrl(item.artworkUrl)!} : undefined} style={[styles.art, {backgroundColor: colors.elevated}]} />
        <Pressable style={styles.copy} onPress={() => play(offlineToTrack(item))}>
          <Text style={[styles.title, {color: colors.text}]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.meta, {color: colors.muted}]} numberOfLines={1}>{item.subtitle}</Text>
        </Pressable>
        <Pressable onPress={() => downloads.remove(item.assetId)} hitSlop={8}><Text style={{color: colors.danger, fontWeight: '800'}}>Remove</Text></Pressable>
      </View>)}
    </ScrollView>}
  </Screen>;
}

const styles = StyleSheet.create({
  empty: {paddingVertical: 42, alignItems: 'center'},
  list: {paddingTop: 20},
  row: {flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12},
  art: {width: 56, height: 56, borderRadius: 10},
  copy: {flex: 1, gap: 4},
  title: {fontWeight: '800'},
  meta: {fontSize: 12},
});
