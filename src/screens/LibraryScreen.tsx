import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { destroy, get, post, put } from '../lib/api';
import { useApi } from '../lib/hooks';
import { playlistTracks, toTrack, toTracks } from '../lib/tracks';
import { useAuth } from '../stores/auth';
import { useNavigation } from '../navigation';
import { usePlayer } from '../stores/player';
import {
  Button,
  Card,
  ErrorView,
  Empty,
  Field,
  Heading,
  Label,
  Loading,
  Screen,
  useTheme,
} from '../components/ui';
import { useResponsiveLayout } from '../lib/responsive';

export function LibraryScreen({ path = '/library' }: { path?: string }) {
  const auth = useAuth();
  const nav = useNavigation();
  if (!auth.hydrated)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!auth.token)
    return (
      <Screen>
        <Empty
          title="Sign in to your library"
          detail="Save favourites and create playlists."
          action={
            <Button title="Sign in" onPress={() => nav.navigate('/login')} />
          }
        />
      </Screen>
    );
  if (path.startsWith('/favorites')) return <Favorites />;
  if (path.startsWith('/history')) return <History />;
  const detail = path.match(/^\/playlists\/([^/]+)/);
  if (detail) return <PlaylistDetail id={detail[1]} />;
  return <LibraryHome />;
}

function LibraryHome() {
  const nav = useNavigation();
  const layout = useResponsiveLayout();
  const list = useApi<any>('/me/playlists');
  const follows = useApi<any>('/me/follows');
  const [title, setTitle] = useState('');
  const [titleBn, setTitleBn] = useState('');
  const [busy, setBusy] = useState(false);
  const colors = useTheme();
  const create = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const result = await post<any>('/me/playlists', {
        title: title.trim(),
        title_bn: titleBn.trim() || null,
      });
      setTitle('');
      setTitleBn('');
      await list.mutate();
      nav.navigate(`/playlists/${result.data.id}`);
    } catch {
    } finally {
      setBusy(false);
    }
  };
  const grouped = follows.data?.data || {};
  return (
    <Screen>
      <View style={[styles.titleRow, layout.compact && styles.titleRowCompact]}>
        <Heading>My library</Heading>
        <Button
          title="New playlist"
          onPress={create}
          disabled={!title.trim() || busy}
        />
      </View>
      <Card>
        <Heading>Quick links</Heading>
        <Button
          title="♥ Liked recordings"
          secondary
          onPress={() => nav.navigate('/favorites')}
        />
        <Button
          title="◷ Listening history"
          secondary
          onPress={() => nav.navigate('/history')}
        />
      </Card>
      <Card>
        <Heading>New playlist</Heading>
        <Field
          value={title}
          onChangeText={setTitle}
          placeholder="Playlist name"
        />
        <Field
          value={titleBn}
          onChangeText={setTitleBn}
          placeholder="Bangla title (optional)"
        />
        <Button
          title={busy ? 'Creating…' : 'Create playlist'}
          onPress={create}
          disabled={!title.trim() || busy}
        />
      </Card>
      <Card>
        <Heading>Playlists</Heading>
        {list.error ? (
          <ErrorView
            error={list.error.message}
            onRetry={() => void list.mutate()}
          />
        ) : list.isLoading ? (
          <Loading />
        ) : list.data?.data?.length ? (
          list.data.data.map((item: any) => (
            <Pressable
              key={item.id}
              style={[styles.item, {borderBottomColor: colors.border}]}
              onPress={() => nav.navigate(`/playlists/${item.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Label>{item.title}</Label>
                <Label muted>{item.items_count || 0} items</Label>
              </View>
              <Text style={{ color: colors.accent }}>›</Text>
            </Pressable>
          ))
        ) : (
          <Label muted>No playlists yet.</Label>
        )}
      </Card>
      <Card>
        <Heading>Following</Heading>
        {follows.error ? (
          <ErrorView
            error={follows.error.message}
            onRetry={() => void follows.mutate()}
          />
        ) : Object.keys(grouped).length ? (
          Object.entries(grouped).map(([type, entries]: [string, any]) => (
            <View key={type} style={{ marginBottom: 10 }}>
              <Label muted>{type.replace('_', ' ')}</Label>
              {entries.map((item: any) => (
                <Pressable
                  key={`${item.type}:${item.id}`}
                  onPress={() =>
                    nav.navigate(
                      `/${
                        item.type === 'artist'
                          ? 'artists'
                          : item.type === 'programme'
                          ? 'programmes'
                          : item.type === 'podcast_channel'
                          ? 'podcasts'
                          : 'playlists'
                      }/${item.id}`,
                    )
                  }
                >
                  <Label>{item.name || `${type} #${item.id}`}</Label>
                </Pressable>
              ))}
            </View>
          ))
        ) : (
          <Label muted>Not following anything yet.</Label>
        )}
      </Card>
    </Screen>
  );
}

function Favorites() {
  const nav = useNavigation();
  const colors = useTheme();
  const data = useApi<any>('/me/favorites');
  const playContext = usePlayer(s => s.playContext);
  const assets = data.data?.data || [];
  const tracks = useMemo(() => toTracks(assets), [assets]);
  return (
    <Screen>
      <Heading>Liked recordings</Heading>
      <Label muted>{data.data?.meta?.total || 0} favourites</Label>
      {tracks.length ? (
        <Button
          title="Play all"
          onPress={() => playContext(tracks, 0, 'Liked recordings')}
        />
      ) : null}
      {data.error ? (
        <ErrorView
          error={data.error.message}
          onRetry={() => void data.mutate()}
        />
      ) : data.isLoading ? (
        <Loading />
      ) : assets.length ? (
        assets.map((item: any) => (
          <Pressable
            key={item.id}
            style={[styles.item, {borderBottomColor: colors.border}]}
            onPress={() => nav.navigate(`/assets/${item.id}`)}
          >
            <View style={{ flex: 1 }}>
              <Label>{item.title}</Label>
              <Label muted>
                {item.programme || item.station || 'Archive recording'}
              </Label>
            </View>
            <Text style={{ color: colors.accent }}>♥</Text>
          </Pressable>
        ))
      ) : (
        <Empty
          title="Nothing liked yet"
          detail="Tap the heart on a recording to save it here."
        />
      )}
    </Screen>
  );
}

function History() {
  const nav = useNavigation();
  const colors = useTheme();
  const data = useApi<any>('/me/history');
  const playTrack = usePlayer(s => s.playTrack);
  const entries = (data.data?.data || []).filter((entry: any) => entry.asset);
  return (
    <Screen>
      <Heading>Listening history</Heading>
      <Label muted>{data.data?.meta?.total || 0} plays synced</Label>
      {data.error ? (
        <ErrorView
          error={data.error.message}
          onRetry={() => void data.mutate()}
        />
      ) : data.isLoading ? (
        <Loading />
      ) : entries.length ? (
        entries.map((entry: any, index: number) => {
          const track = toTrack(entry.asset);
          return (
            <Pressable
              key={`${entry.asset.id}:${index}`}
              style={[styles.item, {borderBottomColor: colors.border}]}
              onPress={() => nav.navigate(`/assets/${entry.asset.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Label>{entry.asset.title}</Label>
                <Label muted>
                  {entry.completed
                    ? 'Finished'
                    : `${Math.floor(entry.progress_seconds || 0)}s played`}{' '}
                  · {entry.last_played_at || ''}
                </Label>
              </View>
              {track ? (
                <Button
                  title="Play"
                  secondary
                  onPress={() =>
                    playTrack(
                      track,
                      entry.completed ? 0 : entry.progress_seconds || 0,
                    )
                  }
                />
              ) : null}
            </Pressable>
          );
        })
      ) : (
        <Empty
          title="Nothing played yet"
          detail="Your recent listening will appear here."
        />
      )}
    </Screen>
  );
}

function PlaylistDetail({ id }: { id: string }) {
  const auth = useAuth();
  const nav = useNavigation();
  const colors = useTheme();
  const layout = useResponsiveLayout();
  const mine = useApi<any>(`/me/playlists/${id}`);
  const pub = useApi<any>(`/playlists/${id}`);
  const query = auth.token ? mine : pub;
  const playlist = query.data?.data;
  const playContext = usePlayer(s => s.playContext);
  const tracks = useMemo(() => playlistTracks(playlist?.items), [playlist]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [titleBn, setTitleBn] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionBn, setDescriptionBn] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [following, setFollowing] = useState(false);
  const [reaction, setReaction] = useState<{ likes: number; dislikes: number; my_reaction: 'like' | 'dislike' | null }>({ likes: 0, dislikes: 0, my_reaction: null });
  const [reactionBusy, setReactionBusy] = useState(false);
  useEffect(() => { setFollowing(Boolean(playlist?.is_following)); }, [playlist?.is_following]);
  useEffect(() => {
    if (!playlist?.is_public) return;
    let active = true;
    void get<{ data: typeof reaction }>(`/reactions/playlist/${playlist.id}`).then(result => { if (active) setReaction(result.data); }).catch(() => undefined);
    return () => { active = false; };
  }, [playlist?.id, playlist?.is_public]);
  if (query.error)
    return (
      <Screen>
        <ErrorView
          error={query.error.message}
          onRetry={() => void query.mutate()}
        />
      </Screen>
    );
  if (query.isLoading || !query.data)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!playlist)
    return (
      <Screen>
        <Empty
          title="Playlist not found"
          detail="It may be private or removed."
        />
      </Screen>
    );
  const owner = playlist.is_owner === true;
  const ordered = [...(playlist.items || [])].sort(
    (a: any, b: any) => a.position - b.position,
  );
  const edit = () => {
    setTitle(playlist.title || '');
    setTitleBn(playlist.title_bn || '');
    setDescription(playlist.description || '');
    setDescriptionBn(playlist.description_bn || '');
    setIsPublic(Boolean(playlist.is_public));
    setEditing(true);
  };
  const save = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await put(`/me/playlists/${playlist.id}`, {
        title: title.trim(),
        title_bn: titleBn.trim() || null,
        description: description.trim() || null,
        description_bn: descriptionBn.trim() || null,
        is_public: isPublic,
      });
      setEditing(false);
      await mine.mutate();
      setNotice('Playlist updated.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not update playlist.');
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await destroy(`/me/playlists/${playlist.id}`);
      nav.replace('/library');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not delete playlist.');
    } finally {
      setBusy(false);
    }
  };
  const removeItem = async (itemId: number) => {
    try {
      await destroy(`/me/playlists/${playlist.id}/items/${itemId}`);
      await mine.mutate();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not remove item.');
    }
  };
  const move = async (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= ordered.length) return;
    const ids = ordered.map((x: any) => x.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    try {
      await put(`/me/playlists/${playlist.id}/reorder`, { order: ids });
      await mine.mutate();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not reorder playlist.');
    }
  };
  const toggleFollow = async () => {
    if (!auth.token) { nav.navigate('/login'); return; }
    try {
      const result = await post<{ following: boolean }>('/me/follows/toggle', { followable_type: 'playlist', followable_id: playlist.id });
      setFollowing(result.following);
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not update follow status.'); }
  };
  const react = async (value: 'like' | 'dislike') => {
    if (reactionBusy || !auth.token) { if (!auth.token) nav.navigate('/login'); return; }
    setReactionBusy(true);
    try { const result = await put<{ data: typeof reaction }>(`/reactions/playlist/${playlist.id}`, { reaction: value }); setReaction(result.data); }
    catch (e) { setNotice(e instanceof Error ? e.message : 'Could not save reaction.'); }
    finally { setReactionBusy(false); }
  };
  const share = async () => { try { await Share.share({ title: playlist.title, message: `${playlist.title}\n/playlists/${playlist.id}` }); } catch { setNotice('Could not open sharing.'); } };
  if (editing)
    return (
      <Screen>
        <Pressable onPress={() => setEditing(false)}>
          <Label style={{ color: colors.accent }}>‹ Playlist</Label>
        </Pressable>
        <Heading>Edit playlist</Heading>
        <Field label="Title" value={title} onChangeText={setTitle} />
        <Field label="Bangla title" value={titleBn} onChangeText={setTitleBn} />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <Field
          label="Bangla description"
          value={descriptionBn}
          onChangeText={setDescriptionBn}
          multiline
        />
        <Button
          title={isPublic ? 'Public playlist' : 'Private playlist'}
          secondary
          onPress={() => setIsPublic(value => !value)}
        />
        <Button
          title={busy ? 'Saving…' : 'Save changes'}
          onPress={save}
          disabled={busy || !title.trim()}
        />
        {notice ? (
          <Label style={{ color: colors.accent }}>{notice}</Label>
        ) : null}
      </Screen>
    );
  return (
    <Screen>
      <Pressable onPress={nav.back}>
        <Label style={{ color: colors.accent }}>‹ Back</Label>
      </Pressable>
      <Heading>{playlist.title}</Heading>
      <Label muted>
        {playlist.description || 'Playlist'} ·{' '}
        {playlist.items_count ?? ordered.length} items
        {playlist.is_public ? ' · Public' : ' · Private'}
      </Label>
      <View style={[styles.actions, layout.compact && styles.actionsCompact]}>
        {tracks.length ? (
          <Button
            title="Play all"
            onPress={() => playContext(tracks, 0, playlist.title)}
          />
        ) : null}
        {owner ? (
          <>
            <Button title="Edit" secondary onPress={edit} />
            <Button
              title="Delete"
              secondary
              onPress={() => void remove()}
              disabled={busy}
            />
          </>
        ) : null}
        {!owner ? <Button title={following ? 'Following' : 'Follow'} secondary onPress={() => void toggleFollow()} /> : null}
        {playlist.is_public ? <>
          <Button title={`👍 ${reaction.likes}`} secondary onPress={() => void react('like')} disabled={reactionBusy} />
          <Button title={`👎 ${reaction.dislikes}`} secondary onPress={() => void react('dislike')} disabled={reactionBusy} />
          <Button title="Share" secondary onPress={() => void share()} />
        </> : null}
      </View>
      {notice ? <Label style={{ color: colors.accent }}>{notice}</Label> : null}
      <Card>
        {ordered.length ? (
          ordered.map((item: any, index: number) => (
            <View
              key={item.id || `${item.playable_type}:${item.playable_id}`}
              style={[styles.item, {borderBottomColor: colors.border}]}
            >
              <View style={{ flex: 1 }}>
                <Label>
                  {item.playable?.title || `Item ${item.playable_id}`}
                </Label>
                <Label muted>
                  {item.playable?.programme || item.playable_type}
                </Label>
              </View>
              {owner ? (
                <>
                  <Button
                    title="↑"
                    secondary
                    onPress={() => void move(index, -1)}
                    disabled={index === 0}
                  />
                  <Button
                    title="↓"
                    secondary
                    onPress={() => void move(index, 1)}
                    disabled={index === ordered.length - 1}
                  />
                  <Button
                    title="×"
                    secondary
                    onPress={() => void removeItem(item.id)}
                  />
                </>
              ) : null}
            </View>
          ))
        ) : (
          <Empty
            title="This playlist is empty"
            detail={
              owner
                ? 'Use Add to playlist from a recording.'
                : 'Nothing has been added yet.'
            }
          />
        )}
      </Card>
    </Screen>
  );
}

export default LibraryScreen;
const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRowCompact: {flexDirection: 'column', alignItems: 'stretch', gap: 10},
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2b3746',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionsCompact: {flexDirection: 'column', alignItems: 'stretch'},
});

