import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '../navigation';
import {
  Button,
  Empty,
  ErrorView,
  Label,
  Screen,
  useTheme,
} from '../components/ui';
import { useApi } from '../lib/hooks';
import { mediaUrl } from '../lib/api';
import { localizedText, useTranslation } from '../lib/i18n';
import type { Paginated, WatchShow } from '../lib/types';
import { useResponsiveLayout } from '../lib/responsive';

type ApiResult<T> = {
  data?: T;
  error?: unknown;
  isLoading?: boolean;
  mutate?: () => Promise<unknown>;
};
const asResult = <T,>(value: unknown) => value as ApiResult<T>;

function queryFromPath(path: string) {
  try {
    return (
      new URLSearchParams(path.split('?')[1]?.split('#')[0] || '').get('q') ||
      ''
    );
  } catch {
    return '';
  }
}

function SearchResultCard({
  show,
  onPress,
}: {
  show: WatchShow;
  onPress: () => void;
}) {
  const colors = useTheme();
  const { locale } = useTranslation();
  const text = (field: 'title' | 'description' | 'category') =>
    localizedText(show as unknown as Record<string, unknown>, field, locale);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.result,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {mediaUrl(show.image_url) ? (
        <Image source={{ uri: mediaUrl(show.image_url)! }} style={styles.image} />
      ) : (
        <View
          style={[
            styles.image,
            styles.imageFallback,
            { backgroundColor: colors.elevated },
          ]}
        >
          <Text style={[styles.play, { color: colors.accent }]}>▶</Text>
        </View>
      )}
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>
          {text('category')}
        </Text>
        <Text numberOfLines={2} style={[styles.title, { color: colors.text }]}>
          {text('title')}
        </Text>
        <Text
          numberOfLines={3}
          style={[styles.description, { color: colors.muted }]}
        >
          {text('description')}
        </Text>
        <Text style={[styles.meta, { color: colors.muted }]}>
          {show.year || '—'} · {show.rating || 'G'} ·{' '}
          {show.episodes_count ?? show.episodes?.length ?? 0}{' '}
          {locale === 'bn' ? 'পর্ব' : 'episodes'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function WatchSearchScreen({
  path = '/watch/search',
}: {
  path?: string;
}) {
  const colors = useTheme();
  const layout = useResponsiveLayout();
  const nav = useNavigation();
  const { t } = useTranslation();
  const initialQuery = queryFromPath(path);
  const [input, setInput] = useState(initialQuery);
  const [applied, setApplied] = useState(initialQuery.trim());
  const [page, setPage] = useState(1);
  useEffect(() => {
    setInput(initialQuery);
    setApplied(initialQuery.trim());
    setPage(1);
  }, [initialQuery]);
  const encoded = applied ? `&q=${encodeURIComponent(applied)}` : '';
  const endpoint = `/watch?per_page=12&page=${page}${encoded}`;
  const response = asResult<Paginated<WatchShow>>(
    useApi<Paginated<WatchShow>>(applied ? endpoint : null),
  );
  const shows = response.data?.data || [];
  const lastPage = response.data?.meta?.last_page || 1;
  const submit = () => {
    const next = input.trim();
    setPage(1);
    setApplied(next);
  };
  const clear = () => {
    setInput('');
    setApplied('');
    setPage(1);
  };
  const errorText =
    response.error instanceof Error
      ? response.error.message
      : t('watch.sectionError');
  const count = response.data?.meta?.total;
  const resultLabel = useMemo(
    () =>
      count == null
        ? `${shows.length} ${localeLabel(shows.length)}`
        : `${count} ${localeLabel(count)}`,
    [count, shows.length],
  );
  return (
    <Screen>
      <Pressable onPress={nav.back} style={styles.back}>
        <Text style={{ color: colors.accent, fontWeight: '800' }}>
          ‹ {t('watch.backToWatch')}
        </Text>
      </Pressable>
      <Text style={[styles.heading, { color: colors.text }]}>
        {t('common.search')}
      </Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        {t('watch.portalName')} · {t('watch.browseCategoriesDescription')}
      </Text>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={submit}
          returnKeyType="search"
          placeholder={t('common.search')}
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text }]}
          accessibilityLabel={t('common.search')}
        />
        {input ? (
          <Pressable
            onPress={clear}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Text style={{ color: colors.muted, fontSize: 18 }}>×</Text>
          </Pressable>
        ) : null}
        <Button title={t('common.search')} onPress={submit} />
      </View>
      {!applied ? (
        <Empty
          title={t('watch.browseCategories')}
          detail={t('watch.browseCategoriesDescription')}
        />
      ) : null}
      {applied && response.isLoading && !shows.length ? (
        <ActivityIndicator
          color={colors.accent}
          size="large"
          style={{ marginVertical: 36 }}
        />
      ) : null}
      {applied && response.error ? (
        <ErrorView error={errorText} onRetry={() => void response.mutate?.()} />
      ) : null}
      {applied && !response.isLoading && !response.error && !shows.length ? (
        <Empty title={t('watch.empty')} detail={t('watch.emptyDescription')} />
      ) : null}
      {applied && shows.length ? (
        <>
          <Label muted>{resultLabel}</Label>
          <View style={styles.results}>
            {shows.map(show => (
              <SearchResultCard
                key={show.id}
                show={show}
                onPress={() => nav.navigate(`/watch/${show.slug}`)}
              />
            ))}
          </View>
          {lastPage > 1 ? (
            <View style={styles.pagination}>
              <Pressable
                disabled={page <= 1}
                onPress={() => setPage(value => Math.max(1, value - 1))}
                style={[
                  styles.pageButton,
                  { borderColor: colors.border, opacity: page <= 1 ? 0.4 : 1 },
                ]}
              >
                <Text style={{ color: colors.text }}>‹</Text>
              </Pressable>
              <Text style={{ color: colors.muted }}>
                {page} / {lastPage}
              </Text>
              <Pressable
                disabled={page >= lastPage}
                onPress={() => setPage(value => Math.min(lastPage, value + 1))}
                style={[
                  styles.pageButton,
                  {
                    borderColor: colors.border,
                    opacity: page >= lastPage ? 0.4 : 1,
                  },
                ]}
              >
                <Text style={{ color: colors.text }}>›</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function localeLabel(count: number) {
  return count === 1 ? 'show' : 'shows';
}

const styles = StyleSheet.create({
  back: { marginBottom: 18 },
  heading: { fontSize: 29, lineHeight: 35, fontWeight: '900' },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 17 },
  searchBar: {
    borderWidth: 1,
    borderRadius: 13,
    minHeight: 50,
    paddingLeft: 13,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  input: { flex: 1, minHeight: 46, fontSize: 15 },
  results: { marginTop: 13, gap: 13 },
  result: {
    borderWidth: 1,
    borderRadius: 13,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 130,
  },
  image: { width: 130, minHeight: 130 },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  play: { fontSize: 25 },
  copy: { flex: 1, minWidth: 0, padding: 12 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { fontSize: 17, lineHeight: 21, fontWeight: '900', marginTop: 5 },
  description: { fontSize: 13, lineHeight: 18, marginTop: 5 },
  meta: { fontSize: 11, marginTop: 7 },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
  },
  pageButton: {
    borderWidth: 1,
    borderRadius: 17,
    minWidth: 35,
    minHeight: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
