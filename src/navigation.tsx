import React, {createContext, useCallback, useContext, useMemo, useState, useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from './components/ui';
import HomeScreen from './screens/HomeScreen';
import {BrowseScreen, SearchScreen, default as CatalogueListScreen, CatalogueDetailScreen} from './screens/CatalogueScreens';
import {LiveScreen} from './screens/LiveScreen';
import {AccountScreen} from './screens/AccountScreen';
import {LibraryScreen} from './screens/LibraryScreen';
import {SupportScreen} from './screens/SupportScreen';
import {PremiumScreen} from './screens/PremiumScreen';
import {NewsScreen} from './screens/NewsScreen';
import {WatchScreen} from './screens/WatchScreen';
import {ClipsScreen} from './screens/ClipsScreen';
import PlayerBar from './components/PlayerBar';
import PlayerEngine from './components/PlayerEngine';
import PlayerScreen from './screens/PlayerScreen';
import DownloadsScreen from './screens/DownloadsScreen';
import WatchLiveScreen from './screens/WatchLiveScreen';
import WatchSearchScreen from './screens/WatchSearchScreen';
import {UserModals} from './components/UserModals';
import {useUi} from './stores/ui';
import PortalHeader from './components/PortalHeader';

export interface Navigation {
  path: string;
  navigate: (path: string) => void;
  replace: (path: string) => void;
  back: () => void;
}
const NavigationContext = createContext<Navigation | null>(null);
export function useNavigation(): Navigation {
  const value = useContext(NavigationContext);
  if (!value) throw new Error('useNavigation must be used inside AppNavigator');
  return value;
}

function normalise(path: string) {
  const match = path.match(/^([^?#]*)([?#].*)?$/);
  const clean = (match?.[1] || '/').replace(/\\/g, '/').replace(/\/+/g, '/');
  const pathname = clean.length > 1 ? clean.replace(/\/$/, '') : '/';
  return pathname + (match?.[2] || '');
}

function ScreenRouter({path}: {path: string}) {
  const current = normalise(path);
  const route = current.split(/[?#]/, 1)[0];
  if (route === '/') return <HomeScreen />;
  if (route === '/browse') return <BrowseScreen />;
  if (route === '/search') return <SearchScreen />;
  if (route === '/live' || route.startsWith('/live/')) return <LiveScreen path={route} />;
  if (route === '/offline') return <DownloadsScreen />;
  if (route === '/player') return <PlayerScreen />;
  if (route === '/news' || route.startsWith('/news/')) return <NewsScreen path={current} />;
  if (route === '/watch/clips' || route.startsWith('/watch/clips/') || route === '/clips') return <ClipsScreen />;
  if (route === '/watch/live' || route.startsWith('/watch/live/')) return <RouteErrorBoundary><View style={styles.routeRegion}><WatchLiveScreen path={current} /></View></RouteErrorBoundary>;
  if (route === '/watch/search') return <WatchSearchScreen path={current} />;
  if (route === '/watch' || route.startsWith('/watch/')) return <WatchScreen path={current} />;
  if (route === '/ott') return <WatchScreen path="/watch" />;
  if (route === '/account' || route === '/login' || route === '/register' || route === '/settings') return <AccountScreen path={route} />;
  if (route === '/downloads') return <DownloadsScreen />;
  if (route.startsWith('/library') || route.startsWith('/favorites') || route.startsWith('/history') || route.startsWith('/playlists')) return <LibraryScreen path={route} />;
  if (route === '/support' || route.startsWith('/assets/') && route.endsWith('/report')) return <SupportScreen path={current} />;
  if (route === '/premium') return <PremiumScreen />;
  const catalogue = route.match(/^\/(songs|albums|artists|programmes|podcasts|audiobooks|episodes|podcast-episodes|assets)(?:\/([^/]+))?$/);
  if (catalogue) return catalogue[2] ? <CatalogueDetailScreen path={route} /> : <CatalogueListScreen kind={catalogue[1]} />;
  return <HomeScreen />;
}

type Portal = 'listen' | 'watch' | 'news';

class RouteErrorBoundary extends React.Component<React.PropsWithChildren, {error: Error | null}> {
  state: {error: Error | null} = {error: null};
  static getDerivedStateFromError(error: Error) { return {error}; }
  render() {
    if (this.state.error) return <View style={styles.routeError}><Text style={styles.routeErrorTitle}>Live TV could not be displayed</Text><Text style={styles.routeErrorText}>Please refresh this screen.</Text></View>;
    return this.props.children;
  }
}

function portalForRoute(route: string): Portal {
  if (route === '/news' || route.startsWith('/news/')) return 'news';
  if (route === '/watch' || route.startsWith('/watch/') || route === '/clips' || route === '/ott') return 'watch';
  return 'listen';
}

export function AppNavigator() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const [path, setPath] = useState('/');
  const [history, setHistory] = useState<string[]>([]);
  const navigate = useCallback((next: string) => {
    setPath(normalise(next));
    setHistory(previous => [...previous, path]);
  }, [path]);
  const replace = useCallback((next: string) => setPath(normalise(next)), []);
  const back = useCallback(() => setHistory(previous => {
    if (!previous.length) { setPath('/'); return previous; }
    const copy = previous.slice();
    setPath(copy.pop() || '/');
    return copy;
  }), []);
  const value = useMemo(() => ({path, navigate, replace, back}), [path, navigate, replace, back]);
  const route = normalise(path).split(/[?#]/, 1)[0];
  const portal = portalForRoute(route);
  const immersiveClips = route === '/clips' || route === '/watch/clips' || route.startsWith('/watch/clips/');
  const setPortal = useUi(state => state.setPortal);
  useEffect(() => {
    setPortal(portal);
  }, [portal, setPortal]);
  return <NavigationContext.Provider value={value}>
    <View style={[styles.root, {backgroundColor: colors.bg, paddingTop: immersiveClips ? 0 : insets.top}]}>
      <PlayerEngine />
      {!immersiveClips && <PortalHeader portal={portal} route={route} onNavigate={navigate} />}
      <View style={styles.screenRegion}><ScreenRouter path={path} /></View>
      {!immersiveClips && <PlayerBar />}
      <UserModals />
    </View>
  </NavigationContext.Provider>;
}

const styles = StyleSheet.create({
  root: {flex: 1},
  screenRegion: {flex: 1, flexGrow: 1, minHeight: 1},
  routeRegion: {flex: 1, flexGrow: 1, minHeight: 1},
  routeError: {flex: 1, minHeight: 220, padding: 24, justifyContent: 'center', alignItems: 'center'},
  routeErrorTitle: {fontSize: 20, fontWeight: '800', color: '#d43b55', textAlign: 'center'},
  routeErrorText: {fontSize: 14, marginTop: 8, color: '#707681', textAlign: 'center'},
});

export default AppNavigator;


