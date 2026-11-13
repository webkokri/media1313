import CodeInjector from './components/CodeInjector.jsx';
import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Live from './pages/Live.jsx';
import News from './pages/News.jsx';
import Article from './pages/Article.jsx';
import Sports from './pages/Sports.jsx';
import Schedule from './pages/Schedule.jsx';
import TV from './pages/TV.jsx';
import Radio from './pages/Radio.jsx';
import Shows from './pages/Shows.jsx';
import Podcasts from './pages/Podcasts.jsx';
import About from './pages/About.jsx';
import SignIn from './pages/SignIn.jsx';
import BuilderPage, { NotFound } from './builder/BuilderPage.jsx';
import { useContent } from './content.jsx';
import EditBar from './builder/EditBar.jsx';

const CanvasEditor = lazy(() => import('./builder/CanvasEditor.jsx'));
// The page builder (admin) loads this site inside an iframe at /__pb to edit pages visually.
const inBuilderFrame = (() => { try { return window.parent !== window && window.parent.location.pathname.startsWith('/admin/builder'); } catch { return false; } })();

const DARK_PAGES = ['/live', '/tv'];

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const { _pages = [] } = useContent();
  if (pathname === '/__pb' && inBuilderFrame) return <Suspense fallback={null}><CanvasEditor /></Suspense>;
  // A published builder page replaces the built-in page at the same address ("home" = "/").
  const slug = pathname === '/' ? 'home' : pathname.replace(/^\/|\/$/g, '');
  if (_pages.includes(slug)) return <><ScrollManager /><CodeInjector /><BuilderPage slug={slug} /><EditBar /></>;
  const dark = DARK_PAGES.includes(pathname);
  return (
    <div className={dark ? 'app app--dark' : 'app'}>
      <ScrollManager />
      <CodeInjector />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/live" element={<Live />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:slug" element={<Article />} />
        <Route path="/sports" element={<Sports />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/tv" element={<TV />} />
        <Route path="/radio" element={<Radio />} />
        <Route path="/shows" element={<Shows />} />
        <Route path="/podcasts" element={<Podcasts />} />
        <Route path="/about" element={<About />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <EditBar />
    </div>
  );
}
