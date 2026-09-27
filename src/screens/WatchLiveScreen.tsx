import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {RTCView} from '@livekit/react-native-webrtc';
import {AudioSession, registerGlobals} from '@livekit/react-native';
import {Room, RoomEvent, type RemoteTrack} from 'livekit-client';
import {useWatchLiveChannels} from '../lib/hooks';
import {useResponsiveLayout} from '../lib/responsive';
import {mediaUrl, post} from '../lib/api';
import type {LiveTokenResponse, WatchLiveChannel} from '../lib/types';
import {Button, Card, Empty, ErrorView, Heading, Label, Loading, useTheme} from '../components/ui';
import {useAuth} from '../stores/auth';
import {useUi} from '../stores/ui';
import {localizedText, useTranslation} from '../lib/i18n';

type Connection = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'error';

/** Watch portal live television, backed by the same LiveKit rooms as the web viewer. */
export default function WatchLiveScreen({path = ''}: {path?: string}) {
  const colors = useTheme();
  const {width, gutter} = useResponsiveLayout();
  const videoWidth = Math.max(0, Math.min(width - gutter * 2, 900));
  const videoHeight = Math.min(506, Math.max(210, (videoWidth * 9) / 16));
  const channelWidth = width >= 768 ? 190 : 154;
  const {locale, t} = useTranslation();
  const auth = useAuth();
  const ui = useUi();
  const channelsQuery = useWatchLiveChannels();
  // Laravel resource collections return `{data: [...]}`, while local/mocked
  // clients often return the array directly. Accept both shapes so an offline
  // catalogue is rendered instead of falling through to the empty state.
  const channels = useMemo(() => readChannels(channelsQuery.data), [channelsQuery.data]);
  const requestedId = Number(path.match(/\/watch\/live\/(\d+)/)?.[1] || 0);
  const [selectedId, setSelectedId] = useState<number | null>(requestedId || null);
  const [connection, setConnection] = useState<Connection>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [stationId, setStationId] = useState<number | null>(null);
  const roomRef = useRef<Room | null>(null);
  const generationRef = useRef(0);
  const tracksRef = useRef<RemoteTrack[]>([]);
  const mutedRef = useRef(false);
  const audioSessionRef = useRef(false);
  const routeIdRef = useRef(requestedId);

  const selected = useMemo(
    () => channels.find(channel => channel.id === selectedId)
      || channels.find(channel => channel.id === requestedId)
      || channels.find(channel => channel.is_live)
      || channels[0],
    [channels, requestedId, selectedId],
  );

  useEffect(() => {
    // Keep a deep-link id pending while the initial list is still empty; the
    // requested channel may arrive with the first API response.
    const waitingForRouteChannel = requestedId > 0 && selectedId === requestedId && channels.length === 0;
    if (selected && selected.id !== selectedId && !waitingForRouteChannel) setSelectedId(selected.id);
    if (!selected && selectedId !== null && !waitingForRouteChannel) setSelectedId(null);
  }, [channels.length, requestedId, selected, selectedId]);

  const disconnect = useCallback((next: Connection = 'idle') => {
    generationRef.current += 1;
    const room = roomRef.current;
    roomRef.current = null;
    tracksRef.current.forEach(track => { try { track.detach(); } catch { /* already detached */ } });
    tracksRef.current = [];
    try { room?.disconnect(); } catch { /* idempotent on unmount */ }
    if (audioSessionRef.current) {
      audioSessionRef.current = false;
      void AudioSession.stopAudioSession().catch(() => undefined);
    }
    mutedRef.current = false;
    setMuted(false);
    setVideoUrl(null);
    setConnection(next);
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  // The navigator keeps this screen mounted when moving between
  // `/watch/live/:id` routes. Reset the selected channel and any native room
  // when that route id changes so the new deep link is honoured.
  useEffect(() => {
    if (routeIdRef.current === requestedId) return;
    routeIdRef.current = requestedId;
    disconnect();
    setSelectedId(requestedId || null);
  }, [disconnect, requestedId]);

  useEffect(() => {
    if (selected && !selected.is_live && (connection === 'connecting' || connection === 'live' || connection === 'reconnecting')) {
      disconnect();
      setMessage(t('watchLive.ended'));
    }
  }, [connection, disconnect, selected, t]);

  const connect = useCallback(async () => {
    if (!selected || !selected.is_live || connection === 'connecting' || connection === 'live') return;
    if (!auth.token) {
      ui.openLoginPrompt(t('watch.signInToWatchLive'));
      return;
    }
    if (!auth.entitlements?.is_premium && !auth.user?.is_premium) {
      ui.openUpgradePrompt({title: t('watch.premiumLiveTitle'), body: t('watch.premiumLiveDescription')});
      return;
    }
    disconnect('connecting');
    const attempt = generationRef.current;
    setMessage(null);
    try {
      registerGlobals();
      const credentials = await post<LiveTokenResponse>(`/watch-live-channels/${selected.id}/token`);
      if (generationRef.current !== attempt) return;
      if (!credentials.ws_url || !credentials.token) throw new Error('Live video credentials are unavailable.');
      // RTCView cannot report viewport visibility to LiveKit. Keeping adaptive
      // streaming disabled prevents a remote camera from being suspended.
      const room = new Room({adaptiveStream: false, dynacast: true});
      roomRef.current = room;
      audioSessionRef.current = true;
      await AudioSession.startAudioSession();
      if (generationRef.current !== attempt) {
        try { room.disconnect(); } catch { /* stale connection */ }
        await AudioSession.stopAudioSession().catch(() => undefined);
        audioSessionRef.current = false;
        return;
      }
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (roomRef.current !== room || generationRef.current !== attempt) return;
        tracksRef.current.push(track);
        if (track.kind === 'video') {
          const stream = (track as any).mediaStream;
          try {
            const url = typeof stream?.toURL === 'function' ? stream.toURL() : null;
            if (url) setVideoUrl(url);
          } catch {
            // A native stream can disappear while a room is reconnecting.
          }
        } else if (track.kind === 'audio') {
          try { (track as any).setVolume(mutedRef.current ? 0 : 1); } catch { /* native audio session remains active */ }
        }
      });
      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        try { track.detach(); } catch { /* already detached */ }
        if (roomRef.current !== room || generationRef.current !== attempt) return;
        tracksRef.current = tracksRef.current.filter(item => item !== track);
        if (track.kind === 'video') setVideoUrl(null);
      });
      room.on(RoomEvent.Reconnecting, () => { if (roomRef.current === room) setConnection('reconnecting'); });
      room.on(RoomEvent.Reconnected, () => { if (roomRef.current === room) setConnection('live'); });
      room.on(RoomEvent.TrackSubscriptionFailed, () => {
        if (roomRef.current === room) setMessage(t('watchLive.connectionFailed'));
      });
      room.on(RoomEvent.Disconnected, () => { if (roomRef.current === room) disconnect(); });
      await room.connect(credentials.ws_url, credentials.token);
      if (roomRef.current !== room || generationRef.current !== attempt) {
        room.disconnect();
        return;
      }
      setConnection('live');
    } catch (error) {
      if (generationRef.current !== attempt) return;
      try { roomRef.current?.disconnect(); } catch { /* noop */ }
      roomRef.current = null;
      if (audioSessionRef.current) {
        audioSessionRef.current = false;
        void AudioSession.stopAudioSession().catch(() => undefined);
      }
      setVideoUrl(null);
      setConnection('error');
      setMessage(error instanceof Error ? error.message : t('watchLive.connectionFailed'));
    }
  }, [auth.entitlements?.is_premium, auth.token, auth.user?.is_premium, connection, disconnect, selected, t, ui]);

  const toggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    tracksRef.current.forEach(track => { if (track.kind === 'audio') { try { (track as any).setVolume(next ? 0 : 1); } catch { /* noop */ } } });
    setMuted(next);
  };
  const liveCount = channels.filter(channel => channel.is_live).length;
  const stations = useMemo(() => Array.from(new Map(channels.filter(channel => channel.station_id != null).map(channel => [channel.station_id as number, channel.station || channel.station_bn || t('brand.name')])).entries()), [channels, t]);
  const filteredChannels = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return channels.filter(channel => {
      const matchesStation = stationId == null || channel.station_id === stationId;
      const text = `${channel.title} ${channel.title_bn || ''} ${channel.description || ''} ${channel.session_title || ''}`.toLowerCase();
      return matchesStation && (!needle || text.includes(needle));
    });
  }, [channels, query, stationId]);
  const allChannelsLabel = t('common.all') === 'common.all' ? 'All' : t('common.all');

  if (channelsQuery.isLoading && channels.length === 0) return <LiveFrame><View style={styles.stateRoot}><Loading /></View></LiveFrame>;
  if (channelsQuery.error && channels.length === 0) return <LiveFrame><View style={styles.stateRoot}><ErrorView error={t('watchLive.preparingDescription')} onRetry={() => void channelsQuery.mutate()} /></View></LiveFrame>;
  if (!selected) return <LiveFrame><View style={styles.stateRoot}><Empty title={t('watchLive.preparing')} detail={t('watchLive.preparingDescription')} /></View></LiveFrame>;

  // Never keep a stale native stream mounted after the catalogue marks a
  // channel offline. This also ensures the offline artwork/message is visible
  // while the polling update is being handled.
  const showVideo = selected.is_live && Boolean(videoUrl);

  return (
    <LiveFrame refreshing={channelsQuery.isLoading} onRefresh={() => void channelsQuery.mutate()}>
      <View style={styles.routeRoot}>
      <Label muted style={styles.eyebrow}>{t('watchLive.fromBetar')}</Label>
      <Heading>{t('watchLive.seeMoment')} <Text style={{color: colors.accent}}>{t('watchLive.asItHappens')}</Text></Heading>
      <Label muted style={styles.description}>{t('watchLive.description')}</Label>
      <Card style={styles.playerCard}>
        <View style={[styles.video, {backgroundColor: colors.elevated, height: videoHeight}]}>
          {showVideo ? <RTCView streamURL={videoUrl!} objectFit="contain" style={StyleSheet.absoluteFill} /> : mediaUrl(selected.artwork_url) ? <Image source={{uri: mediaUrl(selected.artwork_url)!}} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          {!showVideo ? <View style={styles.videoShade} /> : null}
          <View style={[styles.liveBadge, {backgroundColor: selected.is_live ? colors.accent : 'rgba(0,0,0,.45)'}]}><Text style={{color: selected.is_live ? colors.accentForeground : '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1}}>{selected.is_live ? t('watch.liveNow') : t('watchLive.offline')}</Text></View>
          {selected.is_live && (connection === 'live' || connection === 'reconnecting') ? <View style={styles.controls}><Label style={{color: '#fff'}}>{connection === 'reconnecting' ? t('watchLive.reconnecting') : t('watchLive.onAir')}</Label><Button title={muted ? t('watchLive.unmute') : t('watchLive.mute')} secondary onPress={toggleMute} /><Button title={t('watchLive.stop')} secondary onPress={() => disconnect()} /></View> : selected.is_live ? <Pressable accessibilityRole="button" accessibilityLabel={t('watchLive.watchChannel', {channel: selected.title})} style={styles.playButton} onPress={() => void connect()} disabled={connection === 'connecting'}><Text style={styles.playButtonText}>{connection === 'connecting' ? '…' : '▶'}</Text></Pressable> : <View style={styles.offlineState}><Label style={{color: '#fff'}}>{t('watchLive.studioOffAir')}</Label><Label muted style={styles.offlineDescription}>{t('watchLive.studioOffAirDescription')}</Label></View>}
        </View>
        <View style={[styles.meta, {flexDirection: width >= 620 ? 'row' : 'column'}]}><View style={styles.flex}><Label muted>{selected.station || selected.station_bn || t('brand.name')}</Label><Heading style={styles.channelTitle}>{localizedText(selected as unknown as Record<string, unknown>, 'title', locale)}</Heading><Label muted>{selected.session_title || selected.description || t('watchLive.programmeFallback')}</Label></View><Label muted>{selected.viewer_count || 0} viewers</Label></View>
        {message ? <Label style={{color: colors.danger, marginTop: 10}}>{message}</Label> : null}
      </Card>
      <View style={styles.sectionHeader}><Heading style={styles.sectionTitle}>{t('watchLive.chooseChannel')}</Heading><Label muted>{liveCount} {t('watchLive.channelsReady')}</Label></View>
      <TextInput value={query} onChangeText={setQuery} placeholder={t('common.search')} placeholderTextColor={colors.muted} style={[styles.filterInput, {color: colors.text, backgroundColor: colors.surface, borderColor: colors.border}]} />
      {stations.length > 0 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
        <Pressable onPress={() => setStationId(null)} style={[styles.filterChip, {borderColor: colors.border, backgroundColor: stationId == null ? colors.accent : colors.surface}]}><Text style={{color: stationId == null ? colors.accentForeground : colors.text, fontWeight: '800'}}>{allChannelsLabel}</Text></Pressable>
        {stations.map(([id, label]) => <Pressable key={id} onPress={() => setStationId(id)} style={[styles.filterChip, {borderColor: colors.border, backgroundColor: stationId === id ? colors.accent : colors.surface}]}><Text style={{color: stationId === id ? colors.accentForeground : colors.text, fontWeight: '800'}}>{label}</Text></Pressable>)}
      </ScrollView> : null}
      <FlatList data={filteredChannels} horizontal showsHorizontalScrollIndicator={false} keyExtractor={item => String(item.id)} contentContainerStyle={styles.channelList} ListEmptyComponent={<Label muted style={styles.noResults}>{t('common.noResults')}</Label>} renderItem={({item}) => <Pressable onPress={() => { if (item.id !== selected.id) disconnect(); setSelectedId(item.id); }} style={[styles.channel, {width: channelWidth, backgroundColor: colors.surface}, item.id === selected.id && {borderColor: colors.accent}]}><ArtworkOrImage uri={item.artwork_url} /><Text numberOfLines={1} style={[styles.channelLabel, {color: colors.text}]}>{localizedText(item as unknown as Record<string, unknown>, 'title', locale)}</Text><Label muted style={styles.channelStatus}>{item.is_live ? t('watch.liveNow') : t('watchLive.offline')}</Label></Pressable>} />
      </View>
    </LiveFrame>
  );
}

function readChannels(payload: unknown): WatchLiveChannel[] {
  if (Array.isArray(payload)) return payload as WatchLiveChannel[];
  if (!payload || typeof payload !== 'object') return [];
  const data = (payload as {data?: unknown}).data;
  if (Array.isArray(data)) return data as WatchLiveChannel[];
  // Be tolerant of a proxy that wraps the resource collection once more.
  if (data && typeof data === 'object' && Array.isArray((data as {data?: unknown}).data)) {
    return (data as {data: WatchLiveChannel[]}).data;
  }
  return [];
}

function LiveFrame({children, refreshing = false, onRefresh}: {children: React.ReactNode; refreshing?: boolean; onRefresh?: () => void}) {
  const colors = useTheme();
  return <ScrollView style={[styles.liveFrame, {backgroundColor: colors.bg}]} contentContainerStyle={styles.liveContent} refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
}

function ArtworkOrImage({uri}: {uri: string | null}) { const source = mediaUrl(uri); return source ? <Image source={{uri: source}} style={styles.artwork} /> : <View style={[styles.artwork, styles.placeholder]}><Text style={styles.placeholderText}>TV</Text></View>; }

const styles = StyleSheet.create({liveFrame: {flex: 1, width: '100%', minHeight: 1, backgroundColor: '#f3f4f6'}, liveContent: {padding: 18, paddingBottom: 110, flexGrow: 1, minHeight: 700}, eyebrow: {textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8}, description: {marginTop: 10, lineHeight: 21}, routeRoot: {width: '100%', flexGrow: 1, minHeight: 520}, stateRoot: {width: '100%', minHeight: 420, flexGrow: 1, justifyContent: 'center'}, playerCard: {padding: 0, overflow: 'hidden', marginTop: 20}, video: {alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}, videoShade: {...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,.38)'}, offlineState: {alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20}, offlineDescription: {color: 'rgba(255,255,255,.72)', textAlign: 'center', lineHeight: 20}, liveBadge: {position: 'absolute', top: 14, left: 14, borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7}, playButton: {width: 82, height: 82, borderRadius: 42, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: .35, shadowRadius: 16, elevation: 6}, playButtonText: {fontSize: 28, color: '#000', marginLeft: 3}, controls: {position: 'absolute', left: 14, right: 14, bottom: 14, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8}, meta: {padding: 15, alignItems: 'flex-start', gap: 12}, flex: {flex: 1}, channelTitle: {fontSize: 21, marginVertical: 3}, sectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27, marginBottom: 8, gap: 10}, sectionTitle: {fontSize: 20}, filterInput: {minHeight: 44, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, marginBottom: 8}, filterChips: {gap: 8, paddingBottom: 8}, filterChip: {borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8}, channelList: {gap: 10, paddingVertical: 4}, channel: {padding: 9, borderWidth: 1, borderColor: 'transparent', borderRadius: 13}, artwork: {width: '100%', aspectRatio: 16 / 9, borderRadius: 9, backgroundColor: '#25324a', marginBottom: 8}, placeholder: {alignItems: 'center', justifyContent: 'center'}, placeholderText: {color: '#9aa8b9', fontWeight: '900', fontSize: 20}, channelLabel: {fontSize: 14, fontWeight: '700'}, channelStatus: {fontSize: 12, marginTop: 3}, noResults: {paddingVertical: 20}});
