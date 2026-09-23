import React, {useEffect, useMemo, useState} from 'react';
import {FlatList, Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {useContinueListening, useForYou, useHome, useLiveChannels} from '../lib/hooks';
import {displayTitle, formatDuration} from '../lib/format';
import {useTranslation} from '../lib/i18n';
import type {CatalogueItem} from '../lib/types';
import {useNavigation} from '../navigation';
import {Artwork, Card, Empty, Heading, Label, Loading, Screen, useTheme} from '../components/ui';
import MediaCard from '../components/MediaCard';
import {toTrack} from '../lib/tracks';
import {usePlayer} from '../stores/player';
import {useResponsiveLayout} from '../lib/responsive';

function artwork(item: CatalogueItem | undefined) {
  if (!item) return null;
  if ('artwork_url' in item) return item.artwork_url;
  return item.type === 'artist' ? item.photo_url : null;
}
function greeting() { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'; }
function greetingKey() { const hour = new Date().getHours(); return hour < 5 ? 'listen.lateNight' : hour < 12 ? 'listen.goodMorning' : hour < 17 ? 'listen.goodAfternoon' : 'listen.goodEvening'; }

export default function HomeScreen() {
  const nav = useNavigation(); const colors = useTheme();
  const {locale, t} = useTranslation();
  const {width, compact} = useResponsiveLayout();
  const artworkSize = Math.min(compact ? Math.max(150, width * 0.56) : 230, 280);
  const home = useHome(); const live = useLiveChannels(); const forYou = useForYou(); const resume = useContinueListening();
  const playTrack = usePlayer(state => state.playTrack);
  const sections: Array<{id: number; title: string; title_bn?: string | null; items: CatalogueItem[]}> = home.data?.sections ?? [];
  const featured = useMemo(() => sections.flatMap((s: {items: CatalogueItem[]}) => s.items).slice(0, 8), [sections]);
  const banners = useMemo(() => (home.data?.banners ?? []) as Array<{title?: string; title_bn?: string; subtitle?: string; subtitle_bn?: string; image_url?: string; target_value?: string}>, [home.data]);
  const slideCount = Math.max(banners.length, featured.length);
  const [slide, setSlide] = useState(0);
  const activeSlide = slideCount ? slide % slideCount : 0;
  const banner = banners[activeSlide] ?? banners[0];
  const hero = featured[activeSlide % Math.max(1, featured.length)];
  useEffect(() => { if (slideCount <= 1) return; const timer = setInterval(() => setSlide(value => (value + 1) % slideCount), 7000); return () => clearInterval(timer); }, [slideCount]);
  const heroTitle = banner ? ((locale === 'bn' && banner.title_bn ? banner.title_bn : banner.title) || (hero ? displayTitle(hero, locale) : t('listen.heroFallback'))) : hero ? displayTitle(hero, locale) : t('listen.heroFallback');
  const heroSubtitle = banner ? (locale === 'bn' && banner.subtitle_bn ? banner.subtitle_bn : banner.subtitle) || t('listen.heroDescription') : t('listen.heroDescription');
  if (home.isLoading && !home.data) return <Screen><Loading /></Screen>;
  return <Screen refreshControl={<RefreshControl refreshing={home.isLoading} onRefresh={() => void home.mutate()} tintColor={colors.accent} />}>
    <View style={[styles.hero, compact && styles.heroCompact, {backgroundColor: colors.surface}]}>
      <Artwork uri={banner?.image_url || (hero ? artwork(hero) : null)} size={artworkSize} />
      <View style={styles.heroCopy}>
        <Label muted>{t('listen.featuredOn', {brand: 'Bangladesh Betar'})}</Label>
        <Heading>{heroTitle}</Heading>
        <Text style={[styles.heroDescription, {color: colors.muted}]}>{heroSubtitle}</Text>
        <Pressable onPress={() => hero && (toTrack(hero) ? playTrack(toTrack(hero)!) : nav.navigate(banner?.target_value || '/browse'))} style={[styles.primary, {backgroundColor: colors.accent}]}><Text style={[styles.primaryText, {color: colors.accentForeground}]}>{t('listen.listenNow')}</Text></Pressable>
      </View>
      {featured.length > 1 ? <FlatList horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroRail} data={featured.slice(0, 6)} keyExtractor={item => `${item.type}-${item.id}`} renderItem={({item, index}) => <Pressable onPress={() => setSlide(index)} style={[styles.heroThumb, {borderTopColor: index === activeSlide ? colors.accent : colors.border, opacity: index === activeSlide ? 1 : .65}]}><Artwork uri={artwork(item)} size={48}/><Text numberOfLines={2} style={[styles.heroThumbText, {color: colors.text}]}>{displayTitle(item, locale)}</Text></Pressable>} /> : null}
    </View>
    {live.data?.data?.length ? <Section title={t('listen.liveStreaming')} action="/live"><FlatList horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfContent} data={live.data.data} keyExtractor={x => String(x.id)} renderItem={({item}) => <Card onPress={() => nav.navigate(`/live/${item.id}`)} style={[styles.liveCard, {width: compact ? Math.max(210, width * .78) : 250}]}><Artwork uri={item.artwork_url} size={58} /><View style={{flex: 1}}><Text style={[styles.itemTitle, {color: colors.text}]} numberOfLines={1}>{displayTitle(item, locale)}</Text><Label muted>{item.is_live ? item.session_title || t('listen.liveNow') : t('listen.offlineNow')}</Label></View></Card>} /></Section> : null}
    {resume.data?.data?.length ? <Section title={t(greetingKey()) || greeting()}><FlatList horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfContent} data={resume.data.data.slice(0, 6)} keyExtractor={(x, i) => String(x.asset?.id ?? i)} renderItem={({item}) => item.asset ? <Card onPress={() => { const t = toTrack(item.asset); if (t) playTrack(t, item.progress_seconds); }} style={[styles.resume, {width: compact ? Math.max(230, width * .84) : 275}]}><Artwork uri={item.asset.artwork_url} size={62}/><View style={{flex: 1}}><Text numberOfLines={1} style={[styles.itemTitle, {color: colors.text}]}>{displayTitle(item.asset, locale)}</Text><Label muted>{formatDuration(item.progress_seconds)} / {formatDuration(item.asset.duration_seconds)}</Label></View></Card> : null} /></Section> : null}
    {forYou.data?.data?.length ? <Section title={forYou.data.personalized ? 'Made for you' : 'Popular now'}><FlatList horizontal showsHorizontalScrollIndicator={false} data={forYou.data.data} keyExtractor={x => `${x.type}-${x.id}`} renderItem={({item}) => <MediaCard item={item} compact />} /></Section> : null}
    {sections.map((section: {id: number; title: string; items: CatalogueItem[]}) => <Section key={section.id} title={section.title}><FlatList horizontal showsHorizontalScrollIndicator={false} data={section.items} keyExtractor={x => `${x.type}-${x.id}`} renderItem={({item}) => <MediaCard item={item} compact />} /></Section>)}
    {!sections.length && !home.isLoading ? <Empty title="Nothing featured yet" detail="Try Browse or Search to explore the archive." /> : null}
  </Screen>;
}

function Section({title, action, children}: {title: string; action?: string; children: React.ReactNode}) { const nav = useNavigation(); const colors = useTheme(); return <View style={styles.section}><View style={styles.sectionHeader}><Text style={[styles.sectionTitle, {color: colors.text}]}>{title}</Text>{action ? <Pressable onPress={() => nav.navigate(action)}><Text style={{color: colors.accent, fontWeight: '800'}}>See all</Text></Pressable> : null}</View>{children}</View>; }
const styles = StyleSheet.create({hero: {borderRadius: 24, padding: 20, flexDirection: 'row', gap: 22, marginBottom: 22, alignItems: 'center', flexWrap: 'wrap'}, heroCompact: {flexDirection: 'column', alignItems: 'stretch', padding: 16, gap: 16}, heroCopy: {flex: 1, justifyContent: 'center', gap: 8, minWidth: 180}, heroDescription: {fontSize: 13, lineHeight: 19}, primary: {alignSelf: 'flex-start', borderRadius: 22, paddingHorizontal: 17, paddingVertical: 10, marginTop: 4}, primaryText: {fontWeight: '800'}, heroRail: {width: '100%', paddingTop: 8, paddingRight: 8}, heroThumb: {width: 190, marginRight: 12, borderTopWidth: 3, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8}, heroThumbText: {flex: 1, fontSize: 12, fontWeight: '800'}, section: {marginBottom: 24}, sectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11}, sectionTitle: {fontSize: 20, fontWeight: '800'}, liveCard: {marginRight: 10, marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: 11}, resume: {marginRight: 10, marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: 11}, shelfContent: {paddingRight: 8}, itemTitle: {fontSize: 14, fontWeight: '800'}});
