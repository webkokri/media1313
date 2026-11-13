import { useApi } from './api.jsx';

/** Shows and videos managed in the admin (Shows / Videos). Empty until loaded. */
export const useShows = () => { const f = useApi('/shows'); return { shows: f.data?.shows || [], loading: !f.data && !f.error, error: f.error }; };
export const useVideos = () => { const f = useApi('/videos'); return { videos: f.data?.videos || [], loading: !f.data && !f.error, error: f.error }; };
