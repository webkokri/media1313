import { createContext, useContext } from 'react';
import { useApi } from './api.jsx';

// Site-wide content (navigation, shows, schedule, podcasts, ...) from GET /api/content.
const ContentContext = createContext(null);

export function ContentProvider({ children }) {
  const state = useApi('/content');
  if (state.error) return <div style={{ padding: 48, fontFamily: 'sans-serif' }}><h1>MEDIA 1313</h1><p>We can’t load the site right now. Please refresh in a moment.</p></div>;
  if (!state.data) return <div style={{ padding: 48, fontFamily: 'sans-serif' }} aria-live="polite">Loading…</div>;
  return <ContentContext.Provider value={state.data}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
