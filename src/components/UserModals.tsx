import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { post } from '../lib/api';
import { useApi } from '../lib/hooks';
import { useNavigation } from '../navigation';
import { Button, Card, Field, Heading, Label, Loading, useTheme } from './ui';
import { useUi } from '../stores/ui';
import { useAuth } from '../stores/auth';

export function UserModals() {
  const colors = useTheme();
  const nav = useNavigation();
  const ui = useUi();
  const auth = useAuth();
  const login = Boolean(ui.loginPromptOpen);
  const upgrade = Boolean(ui.upgradePromptOpen);
  const track = ui.addToPlaylistTrack;
  const playlists = useApi<any>(track && auth.token ? '/me/playlists' : null);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!track) {
      setNewTitle('');
      setNotice('');
    }
  }, [track]);
  const add = async (playlistId: number) => {
    if (!track) return;
    try {
      await post(`/me/playlists/${playlistId}/items`, {
        playable_type: 'audio_asset',
        playable_id: track.assetId,
      });
      setNotice('Added to playlist.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not add to playlist.');
    }
  };
  const create = async () => {
    if (!newTitle.trim() || !track || creating) return;
    setCreating(true);
    try {
      const result = await post<any>('/me/playlists', {
        title: newTitle.trim(),
      });
      await add(result.data.id);
      setNewTitle('');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not create playlist.');
    } finally {
      setCreating(false);
    }
  };
  return (
    <>
      <Modal
        visible={login}
        transparent
        animationType="fade"
        onRequestClose={ui.closeLoginPrompt}
      >
        <View style={styles.backdrop}>
          <Card>
            <Heading>Sign in required</Heading>
            <Label muted>
              {ui.loginPromptMessage || 'Sign in to continue.'}
            </Label>
            <Button
              title="Sign in"
              onPress={() => {
                ui.closeLoginPrompt();
                nav.navigate('/login');
              }}
            />
            <Pressable onPress={ui.closeLoginPrompt} style={styles.dismiss}>
              <Text style={{ color: colors.muted }}>Close</Text>
            </Pressable>
          </Card>
        </View>
      </Modal>
      <Modal
        visible={upgrade}
        transparent
        animationType="fade"
        onRequestClose={ui.closeUpgradePrompt}
      >
        <View style={styles.backdrop}>
          <Card>
            <Heading>Premium feature</Heading>
            <Label muted>
              {ui.upgradeReason?.body || 'Upgrade to Premium to continue.'}
            </Label>
            <Button
              title="Explore Premium"
              onPress={() => {
                ui.closeUpgradePrompt();
                nav.navigate('/premium');
              }}
            />
            <Pressable onPress={ui.closeUpgradePrompt} style={styles.dismiss}>
              <Text style={{ color: colors.muted }}>Close</Text>
            </Pressable>
          </Card>
        </View>
      </Modal>
      <Modal
        visible={Boolean(track)}
        transparent
        animationType="slide"
        onRequestClose={ui.closeAddToPlaylist}
      >
        <View style={styles.backdrop}>
          <Card>
            <Heading>Add to playlist</Heading>
            <Label muted>{track?.title || ''}</Label>
            {playlists.isLoading ? (
              <Loading />
            ) : playlists.data?.data?.length ? (
              playlists.data.data.map((item: any) => (
                <Pressable
                  key={item.id}
                  onPress={() => void add(item.id)}
                  style={styles.playlist}
                >
                  <Label>{item.title}</Label>
                  <Label muted>{item.items_count || 0} items</Label>
                </Pressable>
              ))
            ) : (
              <Label muted>No playlists yet.</Label>
            )}
            <Field
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="New playlist name"
            />
            <Button
              title={creating ? 'Creating…' : 'Create and add'}
              onPress={create}
              disabled={creating || !newTitle.trim()}
            />
            {notice ? (
              <Label style={{ color: colors.accent }}>{notice}</Label>
            ) : null}
            <Button title="Close" secondary onPress={ui.closeAddToPlaylist} />
          </Card>
        </View>
      </Modal>
    </>
  );
}
export default UserModals;
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.6)',
    justifyContent: 'center',
    padding: 20,
  },
  dismiss: { alignItems: 'center', padding: 10 },
  playlist: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2b3746',
  },
});
