import React from 'react';
import {Pressable, ScrollView, Share, StyleSheet, Text, View} from 'react-native';
import {Clapperboard, Headphones, Languages, Moon, Newspaper, RadioTower, Search, Share2, Sun, User, type LucideIcon} from 'lucide-react-native';
import {useResponsiveLayout} from '../lib/responsive';
import {useTranslation} from '../lib/i18n';
import {useUi, type PortalId} from '../stores/ui';
import {useAuth} from '../stores/auth';
import {useTheme} from './ui';

type PortalHeaderProps = {portal: PortalId; route: string; onNavigate: (path: string) => void};
const portalColors: Record<PortalId, {accent: string}> = {
  listen: {accent: '#d43b55'},
  news: {accent: '#3f63e8'},
  watch: {accent: '#38bfc1'},
};
const portalIcons: Record<PortalId, LucideIcon> = {news: Newspaper, watch: Clapperboard, listen: Headphones};
const subTabs: Record<PortalId, Array<{path: string; labelKey: string; fallback: string}>> = {
  listen: [
    {path: '/', labelKey: 'common.home', fallback: 'Home'},
    {path: '/live', labelKey: 'listenNav.liveRadio', fallback: 'Live radio'},
    {path: '/songs', labelKey: 'listenNav.songs', fallback: 'Songs'},
    {path: '/albums', labelKey: 'listenNav.albums', fallback: 'Albums'},
    {path: '/artists', labelKey: 'listenNav.artists', fallback: 'Artists'},
    {path: '/programmes', labelKey: 'listenNav.programmes', fallback: 'Programmes'},
    {path: '/podcasts', labelKey: 'listenNav.podcasts', fallback: 'Podcasts'},
    {path: '/audiobooks', labelKey: 'listenNav.audioBooks', fallback: 'Audio books'},
    {path: '/library', labelKey: 'listenNav.library', fallback: 'Library'},
  ],
  watch: [
    {path: '/watch', labelKey: 'common.home', fallback: 'Home'},
    {path: '/watch/clips', labelKey: 'watch.clips', fallback: 'Clips'},
    {path: '/watch/category/movies', labelKey: 'watch.movies', fallback: 'Movies'},
    {path: '/watch/category/series', labelKey: 'watch.series', fallback: 'Series'},
    {path: '/watch/category/short-films', labelKey: 'watch.shortFilms', fallback: 'Short Films'},
    {path: '/watch/category/songs', labelKey: 'watch.songs', fallback: 'Songs'},
    {path: '/watch/live', labelKey: 'watch.liveTv', fallback: 'Live TV'},
    {path: '/watch/categories', labelKey: 'common.categories', fallback: 'Categories'},
  ],
  news: [
    {path: '/news/latest', labelKey: 'news.latest', fallback: 'Latest'},
    {path: '/news/category/bangladesh', labelKey: 'news.bangladesh', fallback: 'Bangladesh'},
    {path: '/news/category/politics', labelKey: 'news.politics', fallback: 'Politics'},
    {path: '/news/category/world', labelKey: 'news.world', fallback: 'World'},
    {path: '/news/category/business', labelKey: 'news.business', fallback: 'Business'},
    {path: '/news/category/sports', labelKey: 'news.sports', fallback: 'Sports'},
    {path: '/news/category/entertainment', labelKey: 'news.entertainment', fallback: 'Entertainment'},
  ],
};

export default function PortalHeader({portal, route, onNavigate}: PortalHeaderProps) {
  const colors = useTheme();
  const layout = useResponsiveLayout();
  const {t} = useTranslation();
  const ui = useUi();
  const token = useAuth(state => state.token);
  const user = useAuth(state => state.user);
  const ultraCompact = layout.width < 360;
  const accent = portalColors[portal];
  const searchPath = portal === 'listen' ? '/search' : portal === 'news' ? '/news/search' : '/watch/search';
  const selected = (path: string) => path === '/' ? route === '/' : route === path || route.startsWith(`${path}/`);
  const label = (key: string, fallback: string) => { const value = t(key); return value === key ? fallback : value; };
  const ThemeIcon = ui.theme === 'dark' ? Sun : Moon;

  return <View style={[styles.root, {backgroundColor: colors.elevated, borderBottomColor: colors.border}]}>
    <View style={[styles.top, {backgroundColor: colors.header, borderBottomColor: colors.border, paddingHorizontal: layout.compact ? 8 : layout.gutter, minHeight: layout.compact ? 52 : 60}]}>
      <Pressable onPress={() => onNavigate('/')} style={styles.brand} accessibilityLabel="Bangladesh Betar home">
        <View style={[styles.brandMark, {backgroundColor: `${accent.accent}24`, borderColor: `${accent.accent}4d`}]}>
          <RadioTower size={24} color={accent.accent} strokeWidth={2.25} />
          <View style={[styles.liveDot, {borderColor: colors.header}]} />
        </View>
        {layout.width >= 768 && <View><Text style={[styles.brandName, {color: colors.text}]}>Bangladesh <Text style={{color: accent.accent}}>Betar</Text></Text><Text style={[styles.brandBangla, {color: colors.secondary}]}>বাংলাদেশ বেতার</Text></View>}
      </Pressable>

      <View style={[styles.serviceTabs, {flex: layout.compact ? 1 : 0}]} accessibilityRole="tablist">
        {(['news', 'watch', 'listen'] as PortalId[]).map(id => {
          const active = id === portal;
          const Icon = portalIcons[id];
          if (ultraCompact && !active) return null;
          return <Pressable key={id} onPress={() => onNavigate(id === 'listen' ? '/' : `/${id}`)} style={[styles.serviceTab, {borderColor: colors.border, borderTopColor: active ? portalColors[id].accent : colors.border, borderTopWidth: active ? 4 : 1, flex: layout.compact ? 0 : undefined, minWidth: layout.compact ? undefined : 96, width: layout.compact ? (active ? 56 : 36) : undefined, height: layout.compact ? 36 : 42, marginTop: 0, paddingHorizontal: layout.compact ? 5 : 20}]} accessibilityRole="tab" accessibilityState={{selected: active}}>
            {layout.compact && !active && <Icon size={17} color={colors.secondary} strokeWidth={2.2} />}
            {(!layout.compact || active) && <Text style={[styles.serviceText, {color: active ? portalColors[id].accent : colors.secondary, fontSize: layout.compact ? 13 : 15}]}>{label(`common.${id}`, id[0].toUpperCase() + id.slice(1))}</Text>}
          </Pressable>;
        })}
      </View>

      {!layout.compact && <View style={styles.spacer} />}

      <View style={styles.actions}>
        <Pressable onPress={() => void Share.share({message: 'Bangladesh Betar'}).catch(() => {})} style={[styles.action, {width: layout.compact ? 36 : 40, height: layout.compact ? 36 : 40, backgroundColor: colors.elevated, borderColor: colors.border}]} accessibilityLabel="Social links"><Share2 size={16} color={colors.secondary} /></Pressable>
        <Pressable onPress={ui.toggleTheme} style={[styles.action, {width: layout.compact ? 36 : 40, height: layout.compact ? 36 : 40, backgroundColor: colors.elevated, borderColor: colors.border}]} accessibilityLabel="Toggle theme"><ThemeIcon size={16} color={colors.secondary} /></Pressable>
        <Pressable onPress={() => ui.setLocale(ui.locale === 'en' ? 'bn' : 'en')} style={[styles.language, {height: layout.compact ? 36 : 40, backgroundColor: colors.elevated, borderColor: colors.border}]} accessibilityLabel="Switch language"><Languages size={16} color={colors.secondary} />{!layout.compact && <Text style={[styles.controlText, {color: colors.secondary}]}>{ui.locale === 'en' ? 'বাংলা' : 'EN'}</Text>}</Pressable>
        <Pressable onPress={() => onNavigate(token ? '/account' : '/login')} style={[styles.account, layout.compact && styles.accountCompact, {height: layout.compact ? 36 : 40, backgroundColor: `${accent.accent}12`, borderColor: accent.accent}]} accessibilityLabel="Profile">{token && user?.name ? <Text style={[styles.avatarText, {backgroundColor: accent.accent, color: colors.accentForeground}]}>{user.name.trim().charAt(0).toUpperCase()}</Text> : <User size={layout.compact ? 17 : 16} color={accent.accent} />}{!layout.compact && <Text style={[styles.controlText, {color: accent.accent}]}>{token ? (user?.name || label('common.account', 'Account')) : label('common.login', 'Log in')}</Text>}</Pressable>
      </View>
    </View>

    <View style={[styles.subRow, {height: layout.compact ? 52 : 60, paddingHorizontal: layout.compact ? 8 : layout.gutter}]}>
      <ScrollView horizontal style={styles.subScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sub}>
        {subTabs[portal].map(item => { const active = selected(item.path); return <Pressable key={item.path} onPress={() => onNavigate(item.path)} style={[styles.subItem, {height: layout.compact ? 52 : 60}]}><Text style={{color: active ? colors.text : colors.secondary, fontSize: layout.compact ? 12 : 13, fontWeight: active ? '800' : '700'}}>{label(item.labelKey, item.fallback)}</Text>{active && <View style={[styles.subActive, {backgroundColor: accent.accent}]} />}</Pressable>; })}
      </ScrollView>
      <Pressable onPress={() => onNavigate(searchPath)} style={[styles.searchButton, {backgroundColor: colors.elevated, borderColor: colors.border}]} accessibilityLabel="Search"><Search size={17} color={accent.accent} /></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: {borderBottomWidth: StyleSheet.hairlineWidth},
  top: {flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth},
  brand: {flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 36},
  brandMark: {width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  liveDot: {position: 'absolute', right: 1, top: 1, width: 9, height: 9, borderRadius: 5, backgroundColor: '#f42a41', borderWidth: 2},
  brandName: {fontSize: 19, lineHeight: 20, fontWeight: '900', letterSpacing: -0.95},
  brandBangla: {fontSize: 12, lineHeight: 12, marginTop: 5, fontWeight: '800'},
  serviceTabs: {flexDirection: 'row', alignSelf: 'stretch', alignItems: 'center', gap: 6},
  serviceTab: {justifyContent: 'center', alignItems: 'center', paddingBottom: 2, borderWidth: 1, borderBottomWidth: 0, borderRadius: 14, borderTopLeftRadius: 14, borderTopRightRadius: 14},
  serviceText: {fontWeight: '900'},
  spacer: {flex: 1},
  actions: {flexDirection: 'row', alignItems: 'center', gap: 4},
  action: {width: 34, height: 34, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
  language: {height: 34, minWidth: 34, paddingHorizontal: 7, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4},
  account: {height: 34, minWidth: 34, paddingHorizontal: 9, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5},
  accountCompact: {width: 34, paddingHorizontal: 0},
  avatarText: {width: 28, height: 28, borderRadius: 14, textAlign: 'center', textAlignVertical: 'center', fontSize: 12, fontWeight: '900'},
  controlText: {fontSize: 12, fontWeight: '800'},
  subRow: {minHeight: 50, flexDirection: 'row', alignItems: 'center'},
  subScroll: {flex: 1, minWidth: 0},
  sub: {gap: 0},
  subItem: {alignItems: 'center', justifyContent: 'center', position: 'relative', paddingHorizontal: 12},
  subActive: {position: 'absolute', left: 12, right: 12, bottom: 0, height: 4, borderTopLeftRadius: 4, borderTopRightRadius: 4},
  searchButton: {width: 44, height: 44, marginLeft: 8, borderWidth: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center'},
});
