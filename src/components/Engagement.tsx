import React, { useEffect, useState } from 'react';
import {
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { destroy, get, post, put } from '../lib/api';
import { useApi } from '../lib/hooks';
import type {
  Comment,
  PostCommentResponse,
  RatingAggregate,
} from '../lib/types';
import { Button, Card, ErrorView, Label, Loading, useTheme } from './ui';
import { useAuth } from '../stores/auth';
import { useNavigation } from '../navigation';
import { useUi } from '../stores/ui';
import type { PlayerTrack } from '../stores/player';

type Reaction = 'like' | 'dislike';
export default function Engagement({
  assetId,
  allowComments = true,
  title = 'Bangladesh Betar recording',
  initialFavorite = false,
}: {
  assetId: number;
  allowComments?: boolean;
  title?: string;
  initialFavorite?: boolean;
}) {
  const colors = useTheme();
  const nav = useNavigation();
  const auth = useAuth();
  const ui = useUi();
  const comments = useApi<{ data: Comment[]; rating?: RatingAggregate }>(
    `/assets/${assetId}/comments`,
  );
  const asset = useApi<any>(`/assets/${assetId}`);
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(0);
  const [favorite, setFavorite] = useState(initialFavorite);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [reaction, setReaction] = useState<{
    likes: number;
    dislikes: number;
    my_reaction: Reaction | null;
  }>({ likes: 0, dislikes: 0, my_reaction: null });
  const [reactionBusy, setReactionBusy] = useState<Reaction | null>(null);
  useEffect(() => {
    if (asset.data?.data?.is_favorited != null)
      setFavorite(Boolean(asset.data.data.is_favorited));
  }, [asset.data]);
  useEffect(() => {
    let active = true;
    void get<{ data: typeof reaction }>(`/reactions/audio_asset/${assetId}`)
      .then(result => {
        if (active) setReaction(result.data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [assetId, auth.token]);
  const guard = () => {
    if (!auth.token) {
      ui.openLoginPrompt('Sign in to continue.');
      return false;
    }
    return true;
  };
  const toggleFavorite = async () => {
    if (!guard() || busy) return;
    setBusy(true);
    const previous = favorite;
    setFavorite(!previous);
    try {
      const result = await post<{ favorited: boolean }>(
        '/me/favorites/toggle',
        { favoritable_type: 'audio_asset', favoritable_id: assetId },
      );
      setFavorite(result.favorited);
    } catch (e) {
      setFavorite(previous);
      setNotice(e instanceof Error ? e.message : 'Could not update favourite.');
    } finally {
      setBusy(false);
    }
  };
  const react = async (value: Reaction) => {
    if (!guard() || reactionBusy) return;
    const previous = reaction;
    const removing = reaction.my_reaction === value;
    setReactionBusy(value);
    setReaction({
      likes: Math.max(
        0,
        previous.likes +
          (value === 'like'
            ? removing
              ? -1
              : 1
            : previous.my_reaction === 'like'
            ? -1
            : 0),
      ),
      dislikes: Math.max(
        0,
        previous.dislikes +
          (value === 'dislike'
            ? removing
              ? -1
              : 1
            : previous.my_reaction === 'dislike'
            ? -1
            : 0),
      ),
      my_reaction: removing ? null : value,
    });
    try {
      const result = await put<{ data: typeof reaction }>(
        `/reactions/audio_asset/${assetId}`,
        { reaction: value },
      );
      setReaction(result.data);
    } catch {
      setReaction(previous);
      setNotice('Could not save reaction.');
    } finally {
      setReactionBusy(null);
    }
  };
  const submit = async () => {
    if (!guard() || (!body.trim() && !rating) || busy) return;
    setBusy(true);
    try {
      const result = await post<PostCommentResponse>(
        `/assets/${assetId}/comments`,
        { body: body.trim() || undefined, rating: rating || undefined },
      );
      setBody('');
      setRating(0);
      setNotice(result.message);
      if (result.data?.status === 'approved') await comments.mutate();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not post comment.');
    } finally {
      setBusy(false);
    }
  };
  const removeComment = async (id: number) => {
    try {
      await destroy(`/comments/${id}`);
      await comments.mutate();
      setNotice('Comment deleted.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not delete comment.');
    }
  };
  const addPlaylist = () => {
    if (!guard()) return;
    const track: PlayerTrack = {
      key: `audio_asset:${assetId}`,
      type: 'audio_asset',
      id: assetId,
      assetId,
      title,
      titleBn: null,
      subtitle: 'Bangladesh Betar',
      artworkUrl: null,
      duration: null,
      isPremium: false,
      href: `/assets/${assetId}`,
    };
    ui.openAddToPlaylist(track);
  };
  const share = async () => {
    try {
      await Share.share({ title, message: `${title}\n/assets/${assetId}` });
    } catch {
      setNotice('Could not open sharing.');
    }
  };
  return (
    <Card>
      <View style={styles.actions}>
        <Button
          title={favorite ? '♥ Liked' : '♡ Like'}
          secondary
          onPress={() => void toggleFavorite()}
          disabled={busy}
        />
        <Button
          title={`👍 ${reaction.likes}`}
          secondary
          onPress={() => void react('like')}
          disabled={Boolean(reactionBusy)}
        />
        <Button
          title={`👎 ${reaction.dislikes}`}
          secondary
          onPress={() => void react('dislike')}
          disabled={Boolean(reactionBusy)}
        />
        <Button title="Share" secondary onPress={() => void share()} />
        <Button title="Add to playlist" secondary onPress={addPlaylist} />
        <Button
          title="Report"
          secondary
          onPress={() => nav.navigate(`/assets/${assetId}/report`)}
        />
      </View>
      {allowComments ? (
        <>
          <Text style={[styles.heading, { color: colors.text }]}>Comments</Text>
          {comments.error ? (
            <ErrorView
              error={comments.error.message}
              onRetry={() => void comments.mutate()}
            />
          ) : comments.isLoading ? (
            <Loading />
          ) : comments.data?.data?.length ? (
            comments.data.data.map(item => (
              <View
                key={item.id}
                style={[styles.comment, { borderBottomColor: colors.border }]}
              >
                <View style={styles.commentHeader}>
                  <Label>{item.author || 'Listener'}</Label>
                  {item.rating ? (
                    <Text style={{ color: '#d7a843' }}>
                      {' '}
                      {'★'.repeat(item.rating)}
                    </Text>
                  ) : null}
                  {item.is_mine ? (
                    <Pressable onPress={() => void removeComment(item.id)}>
                      <Label style={{ color: colors.danger }}>Delete</Label>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={{ color: colors.text }}>{item.body}</Text>
                <Label muted>{item.created_at || ''}</Label>
              </View>
            ))
          ) : (
            <Label muted>No comments yet.</Label>
          )}
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(value => (
              <Pressable
                key={value}
                onPress={() => guard() && setRating(value)}
              >
                <Text
                  style={{
                    color: value <= rating ? '#d7a843' : colors.muted,
                    fontSize: 24,
                  }}
                >
                  ★
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            multiline
            value={body}
            onChangeText={setBody}
            maxLength={2000}
            placeholder="Share your thoughts"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border },
            ]}
          />
          <Button
            title={
              busy
                ? 'Posting…'
                : rating
                ? 'Post rating/comment'
                : 'Post comment'
            }
            onPress={submit}
            loading={busy}
            disabled={busy || (!body.trim() && !rating)}
          />
          {notice ? (
            <Label style={{ color: colors.accent }}>{notice}</Label>
          ) : null}
        </>
      ) : (
        <Label muted>Comments are disabled for this recording.</Label>
      )}
    </Card>
  );
}
const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heading: { fontSize: 18, fontWeight: '900', marginTop: 18, marginBottom: 8 },
  comment: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stars: { flexDirection: 'row', marginTop: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 75,
    padding: 12,
    marginVertical: 10,
    textAlignVertical: 'top',
  },
});
