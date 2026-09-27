import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  useWindowDimensions,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video from 'react-native-video';
import {
  ArrowLeft,
  Disc3,
  Heart,
  Pause,
  Play,
  Share2,
  ThumbsDown,
  Volume2,
  VolumeX,
  type LucideIcon,
} from 'lucide-react-native';
import { useNavigation } from '../navigation';
import { useTheme } from '../components/ui';
import { get, mediaUrl, put } from '../lib/api';
import { useApi } from '../lib/hooks';
import type { Paginated, WatchClip } from '../lib/types';
import { useAuth } from '../stores/auth';
import { localizedText, translate, useTranslation } from '../lib/i18n';
import { useUi } from '../stores/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The web portal keeps a curated editorial feed available while the API is
// empty during a deployment. Keep the same resilient behavior on mobile.
const FALLBACK_THUMBNAILS: Record<number, number> = {
  1: require('../assets/editorial/watch-hero.png'),
  2: require('../assets/editorial/watch-river.png'),
  3: require('../assets/editorial/watch-music.png'),
  4: require('../assets/editorial/news-tech.png'),
  5: require('../assets/editorial/news-rice.png'),
  6: require('../assets/editorial/news-coast.png'),
};

const FALLBACK_CLIPS: WatchClip[] = [
  {
    id: 1, title: 'Rare historic recording from Swadhin Bangla Betar Kendra', title_bn: null,
    description: 'An original wartime broadcast preserved in the national Betar sound archive.', description_bn: null,
    slug: 'historic-swadhin-bangla-betar-1971', creator_name: 'Bangladesh Betar Archive', creator_handle: '@bangladeshbetar', creator_avatar_url: null,
    video_url: null, thumbnail_url: null, audio_track: 'Original Radio Relay (1971)', hashtags: ['#History', '#1971', '#BetarArchive'], likes_count: 14820, dislikes_count: 42, published_at: null,
  },
  {
    id: 2, title: 'Acoustic Bhatiyali river song at sunset on the Meghna', title_bn: null,
    description: 'A soulful folk melody performed live by traditional Baul singers.', description_bn: null,
    slug: 'acoustic-bhatiyali-river-song', creator_name: 'Betar Folk Hub', creator_handle: '@betarfolk', creator_avatar_url: null,
    video_url: null, thumbnail_url: null, audio_track: 'Nodi Bhora Dheu', hashtags: ['#FolkMusic', '#RiverLife', '#Baul'], likes_count: 8940, dislikes_count: 19, published_at: null,
  },
  {
    id: 3, title: 'Behind the scenes: Foley artists create thunder for radio drama', title_bn: null,
    description: 'Studio 4 demonstrates live acoustic sound effects with everyday materials.', description_bn: null,
    slug: 'foley-voice-artists-thunder-radio-drama', creator_name: 'Drama Studio 4', creator_handle: '@betardrama', creator_avatar_url: null,
    video_url: null, thumbnail_url: null, audio_track: 'Original Studio Foley Sound Effects', hashtags: ['#BehindTheScenes', '#Foley', '#RadioDrama'], likes_count: 12350, dislikes_count: 58, published_at: null,
  },
  {
    id: 4, title: 'Midnight Bhoot Shonibar listener story teaser', title_bn: null,
    description: 'A chilling excerpt from the midnight broadcast about the Sreemangal tea hills.', description_bn: null,
    slug: 'bhoot-shonibar-haunted-tea-estate', creator_name: 'Bhoot Shonibar Official', creator_handle: '@bhootshonibar', creator_avatar_url: null,
    video_url: null, thumbnail_url: null, audio_track: 'Midnight Radio Atmosphere', hashtags: ['#BhootShonibar', '#Horror', '#Supernatural'], likes_count: 24700, dislikes_count: 110, published_at: null,
  },
  {
    id: 5, title: 'Young inventors build floating solar pumps for rural farmers', title_bn: null,
    description: 'Engineering students introduce low-cost, eco-friendly irrigation solutions.', description_bn: null,
    slug: 'floating-solar-pumps-rural-farmers', creator_name: 'Innovators of Bangladesh', creator_handle: '@innovatorsbd', creator_avatar_url: null,
    video_url: null, thumbnail_url: null, audio_track: "Tomorrow's Builders Tech Beat", hashtags: ['#Innovation', '#Solar', '#GreenTech'], likes_count: 6730, dislikes_count: 15, published_at: null,
  },
  {
    id: 6, title: 'Traditional monsoon Hilsa cooking secret in under 60 seconds', title_bn: null,
    description: 'A culinary masterclass exploring an authentic mustard Hilsa preparation.', description_bn: null,
    slug: 'monsoon-ilish-cooking-secret', creator_name: 'The Monsoon Kitchen', creator_handle: '@monsoonkitchen', creator_avatar_url: null,
    video_url: null, thumbnail_url: null, audio_track: 'Rustic Kitchen Beats', hashtags: ['#Food', '#Ilish', '#BengaliCuisine'], likes_count: 18900, dislikes_count: 84, published_at: null,
  },
];

function localized(clip: WatchClip, field: 'title' | 'description') {
  return localizedText(clip as unknown as Record<string, unknown>, field, useUi.getState().locale);
}
const clipText = (key: string) => translate(useUi.getState().locale, `watch.${key}`);
function count(value: number) {
  return value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
    : value >= 1_000
    ? `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`
    : String(value);
}

function ClipItem({
  clip,
  active,
  onNext,
  viewportHeight,
}: {
  clip: WatchClip;
  active: boolean;
  onNext: () => void;
  viewportHeight: number;
}) {
  const colors = useTheme();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const token = useAuth(state => state.token);
  const [playing, setPlaying] = useState(active);
  const [muted, setMuted] = useState(true);
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null);
  const [likes, setLikes] = useState(clip.likes_count || 0);
  const [dislikes, setDislikes] = useState(clip.dislikes_count || 0);
  const [reactionBusy, setReactionBusy] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoUri = mediaUrl(clip.video_url);
  const thumbnailUri = mediaUrl(clip.thumbnail_url);
  React.useEffect(() => setPlaying(active), [active]);
  React.useEffect(() => {
    let cancelled = false;
    void get<{
      data: {
        likes: number;
        dislikes: number;
        my_reaction: 'like' | 'dislike' | null;
      };
    }>(`/reactions/watch_clip/${clip.id}`)
      .then(response => {
        if (!cancelled) {
          setLikes(response.data.likes);
          setDislikes(response.data.dislikes);
          setReaction(response.data.my_reaction);
        }
      })
      .catch(() => {
        /* public playback is independent of reactions */
      });
    return () => {
      cancelled = true;
    };
  }, [clip.id]);
  const react = async (next: 'like' | 'dislike') => {
    if (!token) {
      nav.navigate('/login');
      return;
    }
    if (reactionBusy) return;
    const previous = { reaction, likes, dislikes };
    const removing = reaction === next;
    setReactionBusy(true);
    setReaction(removing ? null : next);
    setLikes(
      Math.max(
        0,
        likes +
          (next === 'like'
            ? removing
              ? -1
              : 1
            : reaction === 'like'
            ? -1
            : 0),
      ),
    );
    setDislikes(
      Math.max(
        0,
        dislikes +
          (next === 'dislike'
            ? removing
              ? -1
              : 1
            : reaction === 'dislike'
            ? -1
            : 0),
      ),
    );
    try {
      const response = await put<{
        data: {
          likes: number;
          dislikes: number;
          my_reaction: 'like' | 'dislike' | null;
        };
      }>(`/reactions/watch_clip/${clip.id}`, { reaction: next });
      setLikes(response.data.likes);
      setDislikes(response.data.dislikes);
      setReaction(response.data.my_reaction);
    } catch {
      setReaction(previous.reaction);
      setLikes(previous.likes);
      setDislikes(previous.dislikes);
    } finally {
      setReactionBusy(false);
    }
  };
  const share = async () => {
    try {
      await Share.share({
        title: localized(clip, 'title'),
        message: `${localized(clip, 'title')} - Bangladesh Betar Clips`,
      });
    } catch {
      /* cancelled */
    }
  };
  return (
    <View style={[styles.item, { height: viewportHeight, backgroundColor: colors.bg }]}>
      {videoUri && !videoError ? (
        <Video
          source={{ uri: videoUri }}
          poster={thumbnailUri || undefined}
          posterResizeMode="cover"
          paused={!playing || !active}
          muted={muted}
          resizeMode="contain"
          onEnd={onNext}
          onError={() => {
            setVideoError(true);
            setPlaying(false);
          }}
          style={StyleSheet.absoluteFill}
        />
      ) : thumbnailUri || FALLBACK_THUMBNAILS[clip.id] ? (
        <Image
          source={thumbnailUri ? { uri: thumbnailUri } : FALLBACK_THUMBNAILS[clip.id]}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.noVideo}>
          <Text style={styles.noVideoText}>Clip unavailable</Text>
        </View>
      )}
      <View style={styles.gradient} pointerEvents="none" />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => setPlaying(value => !value)}
      />
      <Pressable
        onPress={nav.back}
        style={[styles.back, {top: Math.max(18, insets.top + 8)}]}
        accessibilityRole="button"
        accessibilityLabel={clipText('backToWatch')}>
        <ArrowLeft size={20} color="#fff" strokeWidth={2.5} />
        <Text style={styles.backText}>{clipText('backToWatch')}</Text>
      </Pressable>
      <View style={[styles.topControls, {top: Math.max(18, insets.top + 8)}]}>
        <Pressable
          onPress={() => setPlaying(value => !value)}
          style={styles.topButton}
          accessibilityRole="button"
          accessibilityLabel={playing ? clipText('pause') : clipText('play')}>
          {playing ? (
            <Pause size={21} color="#fff" fill="#fff" strokeWidth={2.4} />
          ) : (
            <Play size={21} color="#fff" fill="#fff" strokeWidth={2.4} />
          )}
        </Pressable>
        <Pressable
          onPress={() => setMuted(value => !value)}
          style={styles.topButton}
          accessibilityRole="button"
          accessibilityLabel={muted ? clipText('unmute') : clipText('mute')}>
          {muted ? (
            <VolumeX size={21} color="#fff" strokeWidth={2.4} />
          ) : (
            <Volume2 size={21} color="#fff" strokeWidth={2.4} />
          )}
        </Pressable>
      </View>
      <View style={[styles.sideRail, { bottom: Math.max(22, insets.bottom + 18) }]}>
        <Pressable
          disabled={reactionBusy}
          onPress={() => void react('like')}
          style={styles.action}
          accessibilityLabel={`${clipText('like')} ${count(likes)}`}
        >
          <ActionIcon Icon={Heart} active={reaction === 'like'} />
          <Text style={styles.actionLabel}>{count(likes)}</Text>
        </Pressable>
        <Pressable
          disabled={reactionBusy}
          onPress={() => void react('dislike')}
          style={styles.action}
          accessibilityLabel={`${clipText('dislike')} ${count(dislikes)}`}
        >
          <ActionIcon Icon={ThumbsDown} active={reaction === 'dislike'} />
          <Text style={styles.actionLabel}>{count(dislikes)}</Text>
        </Pressable>
        <Pressable onPress={() => void share()} style={styles.action} accessibilityLabel={clipText('share')}>
          <Share2 size={28} color="#fff" strokeWidth={2.3} />
          <Text style={styles.actionLabel}>{clipText('share')}</Text>
        </Pressable>
        <View style={styles.discAction} accessibilityLabel={clip.audio_track || 'Original Betar audio'}>
          <View style={styles.discIcon}>
            <Disc3 size={26} color="#fff" strokeWidth={2.1} />
          </View>
          <Text numberOfLines={1} style={[styles.actionLabel, styles.discLabel]}>
            {clip.audio_track || 'Original Betar audio'}
          </Text>
        </View>
      </View>
      <View style={styles.copy}>
        <Text style={styles.creator}>
          {clip.creator_name || 'Bangladesh Betar'} {clip.creator_handle || ''}
        </Text>
        <Text style={styles.clipTitle}>{localized(clip, 'title')}</Text>
        <Text numberOfLines={3} style={styles.clipDescription}>
          {localized(clip, 'description')}
        </Text>
        <View style={styles.soundRow}>
          <Disc3 size={15} color="#fff" strokeWidth={2.1} />
          <Text style={styles.sound}>{clip.audio_track || 'Original Betar audio track'}</Text>
        </View>
        <View style={styles.tags}>
          {(clip.hashtags || []).map(tag => (
            <Text key={tag} style={styles.tag}>
              {tag}
            </Text>
          ))}
        </View>
      </View>
      {!playing && (
        <View pointerEvents="none" style={styles.playIndicator}>
          <Play size={28} color="#fff" fill="#fff" strokeWidth={2.2} />
        </View>
      )}
    </View>
  );
}

function ActionIcon({Icon, active}: {Icon: LucideIcon; active?: boolean}) {
  return (
    <View style={[styles.actionIcon, active && styles.actionIconActive]}>
      <Icon
        size={26}
        color="#fff"
        strokeWidth={2.4}
        fill={active ? '#fff' : 'transparent'}
      />
    </View>
  );
}

export function ClipsScreen() {
  const colors = useTheme();
  useTranslation();
  const {height: windowHeight} = useWindowDimensions();
  const [containerHeight, setContainerHeight] = useState(0);
  // useWindowDimensions can exclude the Android navigation area while the
  // actual FlatList viewport still includes it. Measure the real container so
  // every paged item is exactly one screen tall and never drifts after swipes.
  const viewportHeight = containerHeight || Math.max(1, windowHeight);
  const result = useApi<Paginated<WatchClip>>('/watch-clips?per_page=50');
  const clips = result.data?.data?.length ? result.data.data : FALLBACK_CLIPS;
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<WatchClip>>(null);
  const move = useCallback(
    (next: number) => {
      if (!clips.length) return;
      const value = (next + clips.length) % clips.length;
      setIndex(value);
      listRef.current?.scrollToIndex({ index: value, animated: true });
    },
    [clips.length],
  );
  if (result.isLoading && !result.data)
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>{clipText('loadingPortal')}</Text>
      </View>
    );
  return (
    <View
      style={[styles.root, {backgroundColor: colors.bg}]}
      onLayout={event => {
        const nextHeight = Math.round(event.nativeEvent.layout.height);
        if (nextHeight > 0 && nextHeight !== containerHeight) {
          setContainerHeight(nextHeight);
        }
      }}>
      <FlatList
        ref={listRef}
        data={clips}
        style={styles.list}
        keyExtractor={clip => String(clip.id)}
        pagingEnabled
        snapToAlignment="start"
        bounces={false}
        overScrollMode="never"
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, itemIndex) => ({
          length: viewportHeight,
          offset: viewportHeight * itemIndex,
          index: itemIndex,
        })}
        onMomentumScrollEnd={event =>
          setIndex(
            Math.max(
              0,
              Math.min(
                clips.length - 1,
                Math.round(event.nativeEvent.contentOffset.y / viewportHeight),
              ),
            ),
          )
        }
        renderItem={({ item, index: itemIndex }) => (
          <ClipItem
            clip={item}
            active={itemIndex === index}
            onNext={() => move(itemIndex + 1)}
            viewportHeight={viewportHeight}
          />
        )}
      />
    </View>
  );
}

export default ClipsScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0204' },
  list: { flex: 1 },
  item: { width: '100%', overflow: 'hidden' },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,.22)',
  },
  noVideo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noVideoText: { color: '#fff', fontWeight: '800' },
  back: {
    position: 'absolute',
    top: 18,
    left: 15,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: 'rgba(0,0,0,.65)',
  },
  backText: { color: '#fff', fontWeight: '800' },
  topControls: {
    position: 'absolute',
    right: 15,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.3)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: {width: 0, height: 2},
    elevation: 4,
  },
  sideRail: {
    position: 'absolute',
    right: 12,
    width: 52,
    gap: 16,
    alignItems: 'center',
    zIndex: 4,
  },
  action: {
    width: 52,
    minWidth: 52,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discAction: {
    width: 52,
    minWidth: 52,
    maxWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,.46)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.28)',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,.46)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.28)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: {width: 0, height: 2},
    elevation: 4,
  },
  actionIconActive: { backgroundColor: 'rgba(212,59,85,.9)', borderColor: 'rgba(255,255,255,.55)' },
  actionLabel: { fontSize: 11, color: '#fff', fontWeight: '700', marginTop: 2, textAlign: 'center' },
  discLabel: { width: 52, maxWidth: 52 },
  copy: { position: 'absolute', left: 17, right: 72, bottom: 36 },
  creator: { fontSize: 13, color: '#fff', fontWeight: '900' },
  clipTitle: {
    fontSize: 20,
    lineHeight: 25,
    color: '#fff',
    fontWeight: '900',
    marginTop: 6,
  },
  clipDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,.82)',
    marginTop: 5,
  },
  soundRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  sound: { fontSize: 12, color: '#fff', flexShrink: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { fontSize: 11, color: '#fff', fontWeight: '800' },
  playIndicator: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -32,
    marginTop: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
  },
  emptyTitle: { fontSize: 22, fontWeight: '900' },
});
