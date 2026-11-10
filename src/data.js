// Content now comes from the backend (GET /api/content, seeded from backend/seed/content.json).
// Only things that are not content live here.
export const TODAY_LABEL = new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });
