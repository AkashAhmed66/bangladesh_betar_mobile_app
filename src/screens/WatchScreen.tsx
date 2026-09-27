import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  Share,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '../navigation';
import { useTheme } from '../components/ui';
import VideoPlayer from '../components/VideoPlayer';
import { useApi, useWatchLiveChannels } from '../lib/hooks';
import { mediaUrl, post } from '../lib/api';
import type {
  Paginated,
  PortalCategories,
  WatchEpisode,
  WatchShow,
} from '../lib/types';
import { removeWatchlist, toggleWatchlist, useWatchlist } from '../lib/watchlist';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';
import { localizedText, translate, useTranslation } from '../lib/i18n';
import { useResponsiveLayout } from '../lib/responsive';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Check,
  Clapperboard,
  Minimize2,
  Play,
  Plus,
  Share2,
  X,
} from 'lucide-react-native';

type ApiResult<T> = {
  data?: T;
  error?: unknown;
  isLoading?: boolean;
  loading?: boolean;
  refetch?: () => Promise<unknown>;
  mutate?: () => Promise<unknown>;
};
const asResult = <T,>(value: unknown) => value as ApiResult<T>;
type EpisodeReview = {
  id: number;
  body: string;
  author?: string | null;
  rating?: number | null;
  created_at?: string | null;
  is_mine?: boolean;
};
type EpisodeReviews = Paginated<EpisodeReview> & {
  rating?: {
    avg_rating: number;
    rating_count: number;
    distribution?: Record<string, number>;
  };
};
const localized = (value: unknown, field: string) => {
  return localizedText((value || {}) as Record<string, unknown>, field, useUi.getState().locale);
};
const watchText = (key: string, values?: Record<string, string | number>) =>
  translate(useUi.getState().locale, `watch.${key}`, values);
const CATEGORY_COLORS = ['#973e62', '#227f79', '#a56625', '#3f6eb5', '#6552a5'];

function ShowCard({ show, onPress, rank, cardWidthOverride }: { show: WatchShow; onPress: () => void; rank?: number; cardWidthOverride?: number }) {
  const colors = useTheme();
  const { width, compact } = useResponsiveLayout();
  const cardWidth = cardWidthOverride ?? Math.min(352, Math.max(236, width * (compact ? 0.78 : width >= 1024 ? 0.30 : 0.42)));
  return (
    <Pressable onPress={onPress} style={[styles.showCard, { width: cardWidth }]}>
      <View style={[styles.thumbnail, { height: cardWidth * 9 / 16 }]}>
        {show.image_url ? (
          <Image
            source={{ uri: mediaUrl(show.image_url)! }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <Text style={styles.playMark}>▶</Text>
        )}
        <View style={styles.thumbnailShade} />
        {rank ? <Text style={styles.rank}>{rank}</Text> : null}
        <Text style={styles.playBadge}>▶</Text>
      </View>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>
        {localized(show, 'eyebrow') || localized(show, 'category')}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.showTitle, { color: colors.text }]}
      >
        {localized(show, 'title')}
      </Text>
      <Text
        numberOfLines={2}
        style={[styles.showDescription, { color: colors.muted }]}
      >
        {localized(show, 'description')}
      </Text>
      <Text style={[styles.showMeta, { color: colors.muted }]}>
        {show.year || '2026'} · {show.rating || 'G'} ·{' '}
        {watchText('episodesLabel')}: {show.episodes_count ?? show.episodes?.length ?? 0}
      </Text>
    </Pressable>
  );
}

function TrailerModal({
  visible,
  src,
  poster,
  title,
  onClose,
}: {
  visible: boolean;
  src: string;
  poster?: string | null;
  title: string;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.trailerModalRoot}>
        <StatusBar hidden />
        <SafeAreaView style={styles.trailerModalSafe}>
          <View style={styles.trailerModalHeader}>
            <View style={styles.trailerModalTitle}>
              <Clapperboard size={20} color="#fff" strokeWidth={2.2} />
              <Text numberOfLines={1} style={styles.trailerModalTitleText}>
                {title}
              </Text>
            </View>
            <View style={styles.trailerModalActions}>
              <Pressable
                onPress={onClose}
                style={styles.trailerModalButton}
                accessibilityRole="button"
                accessibilityLabel="Exit fullscreen trailer"
              >
                <Minimize2 size={20} color="#fff" strokeWidth={2.3} />
              </Pressable>
              <Pressable
                onPress={onClose}
                style={styles.trailerModalButton}
                accessibilityRole="button"
                accessibilityLabel="Close trailer"
              >
                <X size={21} color="#fff" strokeWidth={2.3} />
              </Pressable>
            </View>
          </View>
          <View style={styles.trailerModalVideo}>
            <VideoPlayer
              src={src}
              poster={poster}
              autoPlay
              fullScreen
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function LoadingOrError({
  loading,
  error,
  empty = false,
}: {
  loading: boolean;
  error?: unknown;
  empty?: boolean;
}) {
  const colors = useTheme();
  if (loading)
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>{watchText('loadingPortal')}</Text>
      </View>
    );
  if (error)
    return (
      <View style={styles.center}>
        <Text style={[styles.heading, { color: colors.text }]}>
          {watchText('unavailable')}
        </Text>
        <Text style={{ color: colors.muted }}>{watchText('retry')}</Text>
      </View>
    );
  if (empty)
    return (
      <View style={styles.center}>
        <Text style={[styles.heading, { color: colors.text }]}>
          {watchText('empty')}
        </Text>
        <Text style={{ color: colors.muted }}>{watchText('emptyDescription')}</Text>
      </View>
    );
  return null;
}

function WatchHome() {
  const nav = useNavigation();
  const colors = useTheme();
  const {locale} = useTranslation();
  const { width, compact, pageStyle } = useResponsiveLayout();
  const heroHeight = Math.min(640, Math.max(compact ? 430 : 500, width * (compact ? 0.78 : 0.52)));
  const result = asResult<Paginated<WatchShow>>(
    useApi<Paginated<WatchShow>>('/watch?per_page=40'),
  );
  const liveResult = asResult<{ data: Array<{ id: number; is_live?: boolean; title?: string; session_title?: string | null; description?: string | null; artwork_url?: string | null }> }>(
    useWatchLiveChannels(),
  );
  const shows = result.data?.data || [];
  const liveChannel = liveResult.data?.data?.find(channel => channel.is_live) || liveResult.data?.data?.[0];
  const featured = shows.filter(item => item.is_featured);
  const heroShows = featured.length >= 2 ? featured.slice(0, 6) : shows.slice(0, 6);
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    if (heroIndex >= heroShows.length && heroShows.length > 0) setHeroIndex(0);
  }, [heroIndex, heroShows.length]);
  useEffect(() => {
    if (heroShows.length <= 1) return;
    const timer = setInterval(() => setHeroIndex(value => (value + 1) % heroShows.length), 6000);
    return () => clearInterval(timer);
  }, [heroShows.length]);
  const hero = heroShows[heroIndex] || heroShows[0];
  const shelves = useMemo(() => {
    const unique = (items: WatchShow[]) =>
      Array.from(new Map(items.map(item => [item.id, item])).values());
    const by = (value: string) => shows.filter(show => show.category === value);
    return [
      {
        title: watchText('newRelease'),
        slug: 'new-release',
        items: unique([
          ...shows.filter(show => (show.year || 0) >= 2026),
          ...shows.slice(0, 4),
        ]),
      },
      { title: watchText('trending'), slug: 'categories', items: shows.slice(0, 8) },
      {
        title: watchText('documentaries'),
        slug: 'documentary',
        items: unique([...by('Documentary'), ...by('Short Films')]),
      },
      {
        title: watchText('popularProgrammes'),
        slug: 'popular-programmes',
        items: unique([
          ...by('Popular Programmes'),
          ...by('Kids'),
          ...by('Drama').slice(0, 2),
        ]),
      },
      {
        title: watchText('comedy'),
        slug: 'comedy',
        items: unique([
          ...by('Comedy'),
          ...shows.filter(show => /koutuk|golpo/i.test(show.slug)),
          ...by('Kids'),
        ]),
      },
      {
        title: watchText('livingAndCulture'),
        slug: 'living-and-culture',
        items: unique([
          ...by('Living and Culture'),
          ...by('Culture'),
          ...by('Songs'),
        ]),
      },
      {
        title: watchText('horror'),
        slug: 'horror',
        items: unique([
          ...by('Horror'),
          ...shows.filter(show => /bhoot|chhaya|pretopuri/i.test(show.slug)),
          ...by('Crime Drama'),
        ]),
      },
      {
        title: watchText('newsAndCurrentAffairs'),
        slug: 'news-and-current-affairs',
        items: unique([
          ...by('News and Current Affairs'),
          ...shows.filter(show => /betar-shongbad|mukhomukhi/i.test(show.slug)),
          ...by('Documentary'),
        ]),
      },
      {
        title: watchText('crimeDrama'),
        slug: 'crime-drama',
        items: unique([...by('Crime Drama'), ...by('Drama'), ...by('Series')]),
      },
    ];
  }, [shows, locale]);
  const refresh = async () => {
    await (result.refetch || result.mutate)?.();
  };
  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.home, pageStyle]}
      refreshControl={
        <RefreshControl
          refreshing={Boolean(result.isLoading ?? result.loading)}
          onRefresh={() => void refresh()}
          tintColor={colors.accent}
        />
      }
    >
      {hero ? (
        <Pressable
          onPress={() => nav.navigate(`/watch/${hero.slug}`)}
          style={[styles.hero, { height: heroHeight }]}
        >
          <Image
            source={hero.image_url ? { uri: hero.image_url } : undefined}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroShade} />
          <View style={[styles.heroCopy, { bottom: heroShows.length > 1 ? 72 : 25 }]}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}> 
              BANGLADESH BETAR WATCH
            </Text>
            <Text style={[styles.heroTitle, { fontSize: width >= 768 ? 52 : width < 380 ? 31 : 37, lineHeight: width >= 768 ? 56 : width < 380 ? 35 : 40 }]}>{localized(hero, 'title')}</Text>
            <Text numberOfLines={3} style={styles.heroDescription}>
              {localized(hero, 'description')}
            </Text>
            <Text style={styles.heroButton}>▶ {watchText('watchNow')}</Text>
          </View>
          {heroShows.length > 1 ? (
            <View style={styles.heroControls}>
              <View style={styles.heroDots}>
                {heroShows.map((item, index) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Go to featured show ${index + 1}`}
                    onPress={() => setHeroIndex(index)}
                    style={[styles.heroDot, { backgroundColor: index === heroIndex ? colors.accent : 'rgba(255,255,255,.48)', width: index === heroIndex ? 28 : 8 }]}
                  />
                ))}
              </View>
              <View style={styles.heroArrows}>
                <Pressable onPress={() => setHeroIndex(value => (value - 1 + heroShows.length) % heroShows.length)} style={styles.heroArrow} accessibilityLabel="Previous featured show"><Text style={styles.heroArrowText}>‹</Text></Pressable>
                <Pressable onPress={() => setHeroIndex(value => (value + 1) % heroShows.length)} style={styles.heroArrow} accessibilityLabel="Next featured show"><Text style={styles.heroArrowText}>›</Text></Pressable>
              </View>
            </View>
          ) : null}
        </Pressable>
      ) : null}
      <LoadingOrError
        loading={Boolean(result.isLoading ?? result.loading) && !shows.length}
        error={result.error}
        empty={!shows.length && !(result.isLoading ?? result.loading)}
      />
      <Pressable style={[styles.liveBanner, compact && styles.liveBannerCompact, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => nav.navigate(liveChannel ? `/watch/live/${liveChannel.id}` : '/watch/live')}>
        {mediaUrl(liveChannel?.artwork_url) ? <Image source={{ uri: mediaUrl(liveChannel?.artwork_url)! }} style={StyleSheet.absoluteFill} /> : null}
        <View style={[styles.liveBannerShade, { backgroundColor: colors.theme === 'light' ? 'rgba(255,255,255,.76)' : 'rgba(5,20,24,.76)' }]} />
        <View style={styles.liveBannerCopy}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>
            {liveChannel?.is_live ? watchText('liveNow') : watchText('liveTv')}
          </Text>
          <Text numberOfLines={2} style={[styles.heading, { color: colors.text }]}>
            {liveChannel?.session_title || liveChannel?.title || watchText('watchLive')}
          </Text>
          <Text numberOfLines={compact ? 3 : 2} style={{ color: colors.muted, marginTop: 3 }}>
            {liveChannel?.description || watchText('watchLive')}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.accent }] }>
          <Text style={styles.pillText}>{watchText('viewChannels')}</Text>
        </View>
      </Pressable>
      {shelves.map(shelf =>
        shelf.items.length ? (
          <View key={shelf.slug} style={styles.shelf}>
            <View style={styles.shelfHeader}>
              <Text style={[styles.heading, { color: colors.text }]}>
                {shelf.title}
              </Text>
              <Pressable
                onPress={() => nav.navigate(`/watch/category/${shelf.slug}`)}
              >
                <Text style={{ color: colors.accent, fontWeight: '800' }}>
                  {watchText('viewAll')}
                </Text>
              </Pressable>
            </View>
            <FlatList
              data={shelf.items}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={{ gap: 14 }}
              renderItem={({ item, index }) => (
                <ShowCard
                  show={item}
                  rank={shelf.slug === 'categories' ? index + 1 : undefined}
                  onPress={() => nav.navigate(`/watch/${item.slug}`)}
                />
              )}
            />
          </View>
        ) : null,
      )}
    </ScrollView>
  );
}

function WatchCategories() {
  const nav = useNavigation();
  const colors = useTheme();
  const { width, tablet, wide, pageStyle } = useResponsiveLayout();
  const cats = asResult<{ data: PortalCategories }>(
    useApi<{ data: PortalCategories }>('/portal-categories'),
  );
  const shows =
    asResult<Paginated<WatchShow>>(
      useApi<Paginated<WatchShow>>('/watch?per_page=50'),
    ).data?.data || [];
  const categories = cats.data?.data.watch || [];
  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.categoryPage, pageStyle]}
    >
      <Text style={[styles.eyebrow, { color: colors.accent }]}>WATCH</Text>
      <Text style={[styles.title, { color: colors.text }]}>
        {watchText('browseCategories')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        {watchText('browseCategoriesDescription')}
      </Text>
      <View style={[styles.categoryGrid, { gap: width >= 700 ? 16 : 12 }]}>
        {categories.map((category, index) => {
          const matching = shows.filter(
            show => show.category === category.value,
          );
          return (
            <Pressable
              key={category.slug}
              onPress={() =>
                nav.navigate(
                  category.slug === 'live-tv'
                    ? '/watch/live'
                    : `/watch/category/${category.slug}`,
                )
              }
              style={[
                styles.categoryTile,
                { width: wide ? '31.8%' : tablet ? '48.5%' : '100%' },
                {
                  backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                  borderColor: colors.border,
                },
              ]}
            >
              {matching[0]?.image_url ? (
                <Image
                  source={{ uri: mediaUrl(matching[0].image_url)! }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <View style={styles.tileShade} />
              <View style={styles.tileCopy}>
                <Text style={styles.playMark}>▶</Text>
                <Text style={styles.tileTitle}>
                  {localized(category, 'label')}
                </Text>
                <Text style={styles.tileCount}>
                  {translate(useUi.getState().locale, matching.length === 1 ? 'common.show' : 'common.shows', {count: matching.length})}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function WatchCategory({ slug }: { slug: string }) {
  const nav = useNavigation();
  const colors = useTheme();
  const { width, compact, tablet, wide, gutter } = useResponsiveLayout();
  const columns = wide ? 4 : tablet ? 3 : compact && width >= 420 ? 2 : 1;
  const [page, setPage] = useState(1);
  const result = asResult<Paginated<WatchShow>>(
    useApi<Paginated<WatchShow>>(
      `/watch?category=${encodeURIComponent(slug)}&per_page=12&page=${page}`,
    ),
  );
  const categoryResult = asResult<{ data: PortalCategories }>(
    useApi<{ data: PortalCategories }>('/portal-categories'),
  );
  const shows = result.data?.data || [];
  const categoryLabel = categoryResult.data?.data.watch?.find(item => item.slug === slug);
  const currentPage = result.data?.meta?.current_page || page;
  const lastPage = result.data?.meta?.last_page || currentPage;
  return (
    <FlatList
      key={`watch-category-${columns}`}
      data={shows}
      numColumns={columns}
      keyExtractor={item => String(item.id)}
      columnWrapperStyle={columns > 1 ? styles.columns : undefined}
      contentContainerStyle={[styles.list, { paddingHorizontal: gutter }]}
      style={{ backgroundColor: colors.bg }}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Pressable onPress={nav.back}>
            <Text style={[styles.back, { color: colors.accent }]}>
              ‹ {watchText('backToWatch')}
            </Text>
          </Pressable>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>WATCH</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {categoryLabel ? localized(categoryLabel, 'label') : slug.replace(/-/g, ' ')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {watchText('categoryDescription', {category: categoryLabel ? localized(categoryLabel, 'label') : slug.replace(/-/g, ' ')})}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <LoadingOrError
          loading={Boolean(result.isLoading ?? result.loading)}
          error={result.error}
          empty={!Boolean(result.isLoading ?? result.loading)}
        />
      }
      renderItem={({ item }) => (
        <ShowCard
          show={item}
          cardWidthOverride={Math.max(0, (width - gutter * 2 - 12 * (columns - 1)) / columns)}
          onPress={() => nav.navigate(`/watch/${item.slug}`)}
        />
      )}
      ListFooterComponent={
        lastPage > 1 ? (
          <View style={styles.pagination}>
            <Pressable
              disabled={currentPage <= 1}
              onPress={() => setPage(value => Math.max(1, value - 1))}
              style={[styles.pageButton, { borderColor: colors.border, opacity: currentPage <= 1 ? 0.4 : 1 }]}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>‹ {watchText('back')}</Text>
            </Pressable>
            <Text style={{ color: colors.muted, fontWeight: '700' }}>Page {currentPage} of {lastPage}</Text>
            <Pressable
              disabled={currentPage >= lastPage}
              onPress={() => setPage(value => Math.min(lastPage, value + 1))}
              style={[styles.pageButton, { borderColor: colors.border, opacity: currentPage >= lastPage ? 0.4 : 1 }]}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>{watchText('viewAll')} ›</Text>
            </Pressable>
          </View>
        ) : undefined
      }
    />
  );
}

function WatchlistScreen() {
  const nav = useNavigation();
  const colors = useTheme();
  const token = useAuth(state => state.token);
  const result = useWatchlist();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'watch_show' | 'watch_episode'>('all');
  const [removing, setRemoving] = useState<number | null>(null);
  const allEntries = result.data?.data || [];
  const entries = allEntries.filter(entry => {
    const show = entry.watchable_type === 'watch_episode' ? entry.item.show : entry.item;
    const text = `${localized(entry.item, 'title')} ${localized(show, 'title')}`.toLowerCase();
    return (filter === 'all' || filter === entry.watchable_type) && text.includes(query.trim().toLowerCase());
  });
  const remove = async (entry: (typeof allEntries)[number]) => {
    if (removing !== null) return;
    setRemoving(entry.id);
    try {
      await removeWatchlist(entry.watchable_type, entry.watchable_id);
      await result.mutate?.();
    } finally {
      setRemoving(null);
    }
  };
  if (!token) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.heading, { color: colors.text }]}>{watchText('signInToWatchlist')}</Text>
        <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 6 }}>{watchText('watchlistEmptyDescription')}</Text>
        <Pressable onPress={() => nav.navigate('/login')} style={[styles.pill, { backgroundColor: colors.accent, marginTop: 16 }]}>
          <Text style={styles.pillText}>{translate(useUi.getState().locale, 'auth.signIn')}</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <FlatList
      data={entries}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.list}
      style={{ backgroundColor: colors.bg }}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Pressable onPress={nav.back}>
            <Text style={[styles.back, { color: colors.accent }]}>
              ‹ {watchText('back')}
            </Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>
            {watchText('myWatchlist')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {watchText('watchlistDescription')}
          </Text>
          <View style={styles.watchlistTools}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={watchText('searchWatchlist')}
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
            />
            <View style={styles.filterRow}>
              {(['all', 'watch_show', 'watch_episode'] as const).map(value => (
                <Pressable
                  key={value}
                  onPress={() => setFilter(value)}
                  style={[styles.filterChip, { borderColor: colors.border, backgroundColor: filter === value ? colors.accent : colors.elevated }]}
                >
                  <Text style={{ color: filter === value ? '#fff' : colors.text, fontSize: 12, fontWeight: '800' }}>
                    {value === 'all' ? watchText('allSavedItems') : value === 'watch_show' ? watchText('savedShows') : watchText('episodesLabel')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={[styles.heading, { color: colors.text }]}>
            {result.isLoading
              ? watchText('loadingShows')
              : watchText('watchlistEmpty')}
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const show =
          item.watchable_type === 'watch_episode' ? item.item.show : item.item;
        return (
          <Pressable
            onPress={() => nav.navigate(`/watch/${show.slug}${item.watchable_type === 'watch_episode' ? `?episode=${item.item.id}` : ''}`)}
            style={[styles.savedRow, { borderColor: colors.border }]}
          >
            {show.image_url ? (
              <Image
                source={{ uri: mediaUrl(show.image_url)! }}
                style={styles.savedImage}
              />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={[styles.showTitle, { color: colors.text }]}>
                {localized(item.item, 'title')}
              </Text>
              <Text style={{ color: colors.muted }}>
                {item.watchable_type === 'watch_episode'
                  ? watchText('episode', {number: (item.item as WatchEpisode).position})
                  : translate(useUi.getState().locale, 'common.programme')}
              </Text>
            </View>
            <Pressable
              onPress={event => {
                event.stopPropagation();
                void remove(item);
              }}
              disabled={removing !== null}
              style={[styles.removeButton, { borderColor: colors.border, opacity: removing !== null ? 0.5 : 1 }]}
            >
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>{removing === item.id ? '…' : watchText('removeFromWatchlist')}</Text>
            </Pressable>
          </Pressable>
        );
      }}
    />
  );
}

function WatchDetail({
  slug,
  initialEpisode,
}: {
  slug: string;
  initialEpisode?: number | null;
}) {
  const nav = useNavigation();
  const colors = useTheme();
  const { width, compact, pageStyle } = useResponsiveLayout();
  const detailHeroHeight = Math.min(
    620,
    Math.max(compact ? 350 : 430, width * (compact ? 0.9 : 0.54)),
  );
  const token = useAuth(state => state.token);
  const isPremium = useAuth(state => Boolean(state.entitlements?.is_premium));
  const result = asResult<{ data: WatchShow }>(
    useApi<{ data: WatchShow }>(`/watch/${encodeURIComponent(slug)}`),
  );
  const show = result.data?.data;
  const [selected, setSelected] = useState<number | null>(
    initialEpisode || null,
  );
  const [saved, setSaved] = useState(Boolean(show?.is_in_watchlist));
  const [reviewBody, setReviewBody] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewNotice, setReviewNotice] = useState('');
  const [trailerOpen, setTrailerOpen] = useState(false);
  const trailerSrc =
    show?.trailer_url ||
    (show as (WatchShow & { trailer_path?: string | null }) | undefined)?.trailer_path ||
    null;
  useEffect(() => {
    if (show) setSaved(Boolean(show.is_in_watchlist));
  }, [show]);
  const current =
    show?.episodes?.find(ep => ep.id === selected) ||
    show?.episodes?.find(ep => ep.has_video) ||
    show?.episodes?.[0];
  const reviews = asResult<EpisodeReviews>(
    useApi<EpisodeReviews>(
      current ? `/watch-episodes/${current.id}/reviews` : null,
    ),
  );
  const related = asResult<Paginated<WatchShow>>(
    useApi<Paginated<WatchShow>>(
      show
        ? `/watch?category=${encodeURIComponent(show.category_slug || show.category)}&per_page=8`
        : null,
    ),
  );
  if (result.isLoading ?? result.loading)
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.muted }}>{watchText('showLoading')}</Text>
      </View>
    );
  if (result.error || !show)
    return (
      <View style={styles.center}>
        <Text style={[styles.heading, { color: colors.text }]}>
          {watchText('showUnavailable')}
        </Text>
        <Pressable onPress={nav.back}>
          <Text style={{ color: colors.accent }}>{watchText('back')}</Text>
        </Pressable>
      </View>
    );
  const play = async (episode: WatchEpisode) => {
    setSelected(episode.id);
    if (!episode.has_video) return;
    if (!token) {
      nav.navigate('/login');
      return;
    }
    if (!isPremium) {
      nav.navigate('/premium');
      return;
    }
    if (!episode.video_url) await result.mutate?.();
  };
  const save = async () => {
    const value = await toggleWatchlist('watch_show', show.id, saved);
    setSaved(value);
  };
  const submitReview = async () => {
    if (!token) {
      nav.navigate('/login');
      return;
    }
    if ((!reviewBody.trim() && !reviewRating) || !current) return;
    try {
      await post(`/watch-episodes/${current.id}/reviews`, {
        body: reviewBody.trim(),
        rating: reviewRating || undefined,
      });
      setReviewBody('');
      setReviewRating(0);
      setReviewNotice(watchText('watchReviews.posted'));
      await reviews.mutate?.();
    } catch (error) {
      setReviewNotice(
        error instanceof Error ? error.message : watchText('watchReviews.postFailed'),
      );
    }
  };
  const canPlay = Boolean(current?.video_url && token && isPremium);
  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={[styles.detail, pageStyle]}
      >
      <Pressable onPress={nav.back}>
        <Text style={[styles.back, { color: colors.accent }]}>
          ‹ {watchText('backToWatch')}
        </Text>
      </Pressable>
      <View style={[styles.detailHero, { height: detailHeroHeight }]}>
        {show.image_url ? (
          <Image
            source={{ uri: mediaUrl(show.image_url)! }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={styles.heroShade} />
        <View style={styles.detailHeroCopy}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>
            {localized(show, 'eyebrow') || localized(show, 'category')}
          </Text>
          <Text style={styles.heroTitle}>{localized(show, 'title')}</Text>
          <Text style={styles.heroDescription}>
            {localized(show, 'description')}
          </Text>
          <View style={[styles.detailActions, { maxWidth: width >= 768 ? 760 : undefined }]}>
            <Pressable
              onPress={() => current && void play(current)}
              style={[styles.detailPrimaryButton, { backgroundColor: colors.accent }]}
            >
              <Play size={17} color="#fff" fill="#fff" strokeWidth={2.3} />
              <Text style={styles.detailActionText}>{watchText('startWatching')}</Text>
            </Pressable>
            {trailerSrc ? (
              <Pressable
                onPress={() => setTrailerOpen(true)}
                style={styles.detailTrailerButton}
                accessibilityRole="button"
                accessibilityLabel={watchText('watchTrailer')}
              >
                <Clapperboard size={17} color="#fff" strokeWidth={2.2} />
                <Text style={styles.detailActionText}>{watchText('watchTrailer')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => void save()}
              style={styles.detailOutlineButton}
              accessibilityRole="button"
              accessibilityLabel={saved ? watchText('saved') : watchText('addToWatchlist')}
            >
              {saved ? (
                <Check size={17} color="#fff" strokeWidth={2.5} />
              ) : (
                <Plus size={17} color="#fff" strokeWidth={2.5} />
              )}
              <Text style={styles.detailActionText}>
                {saved ? watchText('saved') : watchText('addToWatchlist')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void Share.share({ title: localized(show, 'title'), message: `${localized(show, 'title')} — Bangladesh Betar Watch` })}
              style={styles.detailOutlineButton}
              accessibilityRole="button"
              accessibilityLabel={watchText('share')}
            >
              <Share2 size={17} color="#fff" strokeWidth={2.2} />
              <Text style={styles.detailActionText}>{watchText('share')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <View style={{ marginTop: 20, padding: 15, borderRadius: 12 }}>
        <Text style={[styles.heading, { color: colors.text }]}>
          {watchText('aboutProgramme')}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 7 }}>
          {[show.year, show.rating || show.age_rating, ...(show.genres || [])]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {show.audio_languages?.length ? (
          <Text style={{ color: colors.muted, marginTop: 5 }}>
            {watchText('audioLanguages')}: {show.audio_languages.join(' · ')}
          </Text>
        ) : null}
        {show.subtitle_languages?.length ? (
          <Text style={{ color: colors.muted, marginTop: 5 }}>
            {watchText('subtitleLanguages')}: {show.subtitle_languages.join(' · ')}
          </Text>
        ) : null}
        {show.creators?.length ? (
          <Text style={{ color: colors.muted, marginTop: 5 }}>
            {watchText('creators')}:{' '}
            {show.creators
              .map(credit =>
                typeof credit === 'string' ? credit : credit.name,
              )
              .join(', ')}
          </Text>
        ) : null}
        {show.cast?.length ? (
          <Text style={{ color: colors.muted, marginTop: 5 }}>
            {watchText('cast')}:{' '}
            {show.cast
              .map(credit =>
                typeof credit === 'string' ? credit : credit.name,
              )
              .join(', ')}
          </Text>
        ) : null}
      </View>
      {current ? (
        <View style={[styles.playerBox, { backgroundColor: colors.elevated, flexDirection: width >= 1024 ? 'row' : 'column' }]}>
          <View style={[styles.playerMedia, width >= 1024 && { width: '66%' }]}>
          {canPlay ? (
            <VideoPlayer
              src={current.video_url as string}
              title={localized(current, 'title')}
              poster={show.image_url}
            />
          ) : (
            <Pressable
              onPress={() => void play(current)}
              style={styles.videoPlaceholder}
            >
              {show.image_url ? (
                <Image
                  source={{ uri: mediaUrl(show.image_url)! }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <View style={styles.tileShade} />
              <Text style={styles.playMark}>▶</Text>
              <Text style={{ color: '#fff', fontWeight: '800' }}>
                {current.has_video
                  ? !token
                    ? watchText('signInToWatchShort')
                    : watchText('premiumPlaybackTitle')
                  : watchText('videoComingSoon')}
              </Text>
            </Pressable>
          )}
          </View>
          <View style={[styles.playerCopy, width >= 1024 && { flex: 1 }]}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>
              {watchText('episode', {number: current.position})}
            </Text>
            <Text style={[styles.heading, { color: colors.text }]}>
              {localized(current, 'title')}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 5 }}>
              {localized(current, 'description')}
            </Text>
            {current.audio_languages?.length ? (
              <Text style={{ color: colors.muted, marginTop: 8 }}>
                {watchText('audioLanguages')}: {current.audio_languages.join(' · ')}
              </Text>
            ) : null}
            {current.subtitle_languages?.length ? (
              <Text style={{ color: colors.muted, marginTop: 4 }}>
                {watchText('subtitleLanguages')}: {current.subtitle_languages.join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
      <View style={styles.episodeHeader}>
        <Text style={[styles.heading, { color: colors.text }]}>
          {watchText('episodeGuide')}
        </Text>
        <Text style={{ color: colors.muted }}>
          {watchText('episodesLabel')}: {show.episodes.length}
        </Text>
      </View>
      {show.episodes.map(episode => (
        <Pressable
          key={episode.id}
          onPress={() => void play(episode)}
          style={[styles.episodeRow, { borderColor: colors.border }]}
        >
          <View style={styles.episodeNumber}>
            <Text style={{ color: colors.accent, fontWeight: '900' }}>
              {String(episode.position).padStart(2, '0')}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.showTitle, { color: colors.text }]}>
              {localized(episode, 'title')}
            </Text>
            <Text
              numberOfLines={2}
              style={{ color: colors.muted, marginTop: 3 }}
            >
              {localized(episode, 'summary') ||
                localized(episode, 'description')}
            </Text>
          </View>
          <Text style={{ color: colors.muted }}>▶</Text>
        </Pressable>
      ))}
      {current ? (
        <View style={[styles.reviews, { borderTopColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.text }]}>
            {watchText('watchReviews.title')}
          </Text>
          {reviews.isLoading ? (
            <Text style={{ color: colors.muted }}>{watchText('watchReviews.loading')}</Text>
          ) : (
            <>
              {reviews.data?.rating?.avg_rating != null ? (
                <Text style={{ color: colors.muted, marginBottom: 6 }}>
                  ★ {reviews.data.rating.avg_rating.toFixed(1)} ({reviews.data.rating.rating_count} ratings)
                </Text>
              ) : null}
              {(reviews.data?.data || []).map(review => (
                <View
                  key={review.id}
                  style={[styles.review, { borderBottomColor: colors.border }]}
                >
                  <Text style={{ color: colors.text }}>{review.body}</Text>
                  <Text style={{ color: colors.muted, marginTop: 4 }}>
                    {review.author || 'Listener'} · {review.created_at || ''}
                  </Text>
                </View>
              ))}
            </>
          )}
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(value => (
              <Pressable key={value} onPress={() => setReviewRating(value)}>
                <Text
                  style={{
                    fontSize: 23,
                    color: value <= reviewRating ? '#d7a843' : colors.muted,
                  }}
                >
                  ★
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={reviewBody}
            onChangeText={setReviewBody}
            multiline
            placeholder={watchText('watchReviews.placeholder')}
            placeholderTextColor={colors.muted}
            style={[
              styles.reviewInput,
              { color: colors.text, borderColor: colors.border },
            ]}
          />
          <Pressable
            disabled={!reviewBody.trim() && !reviewRating}
            onPress={() => void submitReview()}
            style={[
              styles.reviewButton,
              {
                backgroundColor: colors.accent,
                opacity: reviewBody.trim() || reviewRating ? 1 : 0.45,
              },
            ]}
          >
            <Text style={{ color: '#fff', fontWeight: '900' }}>
              {watchText('watchReviews.submit')}
            </Text>
          </Pressable>
          {reviewNotice ? (
            <Text style={{ color: colors.muted, marginTop: 8 }}>
              {reviewNotice}
            </Text>
          ) : null}
        </View>
      ) : null}
      {related.data?.data?.filter(item => item.id !== show.id).length ? (
        <View style={styles.relatedSection}>
          <View style={styles.episodeHeader}>
            <Text style={[styles.heading, { color: colors.text }]}>{watchText('moreLikeThis')}</Text>
            <Pressable onPress={() => nav.navigate(`/watch/category/${show.category_slug || show.category}`)}>
              <Text style={{ color: colors.accent, fontWeight: '800' }}>{watchText('viewAll')}</Text>
            </Pressable>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={related.data.data.filter(item => item.id !== show.id).slice(0, 8)}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ gap: 14 }}
            renderItem={({ item }) => <ShowCard show={item} onPress={() => nav.navigate(`/watch/${item.slug}`)} />}
          />
        </View>
      ) : null}
      </ScrollView>
      {trailerSrc ? (
        <TrailerModal
          visible={trailerOpen}
          src={trailerSrc}
          poster={show.image_url}
          title={`${localized(show, 'title')} trailer`}
          onClose={() => setTrailerOpen(false)}
        />
      ) : null}
    </>
  );
}

export function WatchScreen({ path }: { path: string }) {
  // Subscribe the route root so all nested portal pages rerender when the
  // language is changed in Account settings.
  useTranslation();
  const route = path.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/watch';
  if (route === '/watch/categories') return <WatchCategories />;
  if (route === '/watch/watchlist') return <WatchlistScreen />;
  if (route.startsWith('/watch/category/'))
    return <WatchCategory slug={route.slice('/watch/category/'.length)} />;
  if (route === '/watch/live') return <WatchCategories />;
  if (route.startsWith('/watch/') && route !== '/watch/clips') {
    const query = path.split('?')[1]?.split('#')[0] || '';
    const episode = Number(new URLSearchParams(query).get('episode'));
    return (
      <WatchDetail
        slug={route.slice('/watch/'.length)}
        initialEpisode={
          Number.isFinite(episode) && episode > 0 ? episode : null
        }
      />
    );
  }
  return <WatchHome />;
}

export default WatchScreen;

const styles = StyleSheet.create({
  home: { paddingTop: 18, paddingBottom: 46 },
  hero: {
    marginBottom: 22,
    backgroundColor: '#101010',
    overflow: 'hidden',
  },
  heroShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,.5)',
  },
  heroCopy: { position: 'absolute', left: 20, right: 20, bottom: 25 },
  heroControls: { position: 'absolute', left: 20, right: 20, bottom: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroDots: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroDot: { height: 8, borderRadius: 4 },
  heroArrows: { flexDirection: 'row', gap: 8 },
  heroArrow: { width: 38, height: 38, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.3)', backgroundColor: 'rgba(0,0,0,.5)' },
  heroArrowText: { color: '#fff', fontSize: 27, lineHeight: 30, fontWeight: '300' },
  heroTitle: {
    color: '#fff',
    fontSize: 37,
    lineHeight: 40,
    fontWeight: '900',
    marginTop: 6,
  },
  heroDescription: {
    color: 'rgba(255,255,255,.78)',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 9,
  },
  heroButton: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 15,
  },
  liveBanner: {
    marginHorizontal: 0,
    marginBottom: 30,
    padding: 17,
    borderRadius: 14,
    backgroundColor: '#173338',
    minHeight: 108,
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveBannerCompact: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: 14, minHeight: 190 },
  liveBannerCopy: { flex: 1, minWidth: 0, justifyContent: 'center' },
  liveBannerShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,20,24,.76)' },
  pill: { borderRadius: 20, paddingVertical: 10, paddingHorizontal: 14 },
  pillText: { color: '#fff', fontWeight: '800' },
  shelf: { marginBottom: 28 },
  shelfHeader: {
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heading: { fontSize: 22, fontWeight: '800' },
  showCard: { minWidth: 0 },
  thumbnail: {
    backgroundColor: '#111827',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,.25)',
  },
  rank: { position: 'absolute', left: 7, bottom: -8, color: '#fff', fontSize: 70, lineHeight: 76, fontWeight: '900', textShadowColor: 'rgba(0,0,0,.85)', textShadowRadius: 6 },
  playBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: '#fff',
    color: '#000',
    borderRadius: 18,
    padding: 10,
    overflow: 'hidden',
  },
  playMark: { fontSize: 28, color: '#fff' },
  eyebrow: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '900',
    marginTop: 10,
  },
  showTitle: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  showDescription: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  showMeta: { fontSize: 11, fontWeight: '700', marginTop: 5 },
  center: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  list: { padding: 16, paddingBottom: 40 },
  columns: { gap: 12, alignItems: 'flex-start' },
  listHeader: { paddingBottom: 20 },
  back: { fontSize: 14, fontWeight: '800', marginTop: 5, marginBottom: 18 },
  title: { fontSize: 35, lineHeight: 40, fontWeight: '900', marginTop: 5 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 8 },
  categoryPage: { padding: 17, paddingBottom: 40 },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
  },
  categoryTile: {
    minHeight: 220,
    borderRadius: 13,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  tileShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,.52)',
  },
  tileCopy: { position: 'absolute', left: 14, right: 12, bottom: 14 },
  tileTitle: { fontSize: 21, fontWeight: '900', color: '#fff', marginTop: 8 },
  tileCount: { fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 5 },
  detail: { padding: 16, paddingBottom: 55 },
  metadata: { marginTop: 20 },
  detailHero: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  detailHeroCopy: { position: 'absolute', left: 17, right: 17, bottom: 19 },
  detailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 13,
  },
  detailPrimaryButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  detailTrailerButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255,255,255,.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.65)',
  },
  detailOutlineButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderColor: 'rgba(255,255,255,.6)',
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  detailActionText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  trailerModalRoot: {
    flex: 1,
    backgroundColor: '#030405',
  },
  trailerModalSafe: { flex: 1 },
  trailerModalHeader: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  trailerModalTitle: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  trailerModalTitleText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  trailerModalActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trailerModalButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.28)',
  },
  trailerModalVideo: { flex: 1, minHeight: 0 },
  playerBox: { marginTop: 20, borderRadius: 13, overflow: 'hidden' },
  playerMedia: { width: '100%' },
  videoPlaceholder: {
    height: 215,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  playerCopy: { padding: 16 },
  episodeHeader: {
    marginTop: 29,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  episodeRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  episodeNumber: { width: 36, alignItems: 'center' },
  reviews: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 26,
    paddingTop: 18,
  },
  review: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  stars: { flexDirection: 'row', gap: 3, marginTop: 9 },
  reviewInput: {
    borderWidth: 1,
    minHeight: 74,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    textAlignVertical: 'top',
  },
  reviewButton: {
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 9,
  },
  savedRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 11,
    alignItems: 'center',
  },
  savedImage: { width: 84, height: 58, borderRadius: 7 },
  watchlistTools: { marginTop: 16, gap: 10 },
  searchInput: { minHeight: 44, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  removeButton: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 7 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, paddingVertical: 24 },
  pageButton: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9 },
  relatedSection: { marginTop: 22 },
});
