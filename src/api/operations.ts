// HTML endpoints used by the client. No JSON/GraphQL exists in this app;
// every endpoint returns server-rendered HTML. IDs are path segments.
export const ENDPOINTS = {
  schedule: (params: Record<string,string>) => {
    const usp = new URLSearchParams(params);
    return `/lis26/schedule?${usp}`;
  },
  event: (id: string) => `/lis26/events/${id}?active_tab=available-events`,
  mySchedule: () => `/lis26/schedule?active_tab=my-schedule`,
  discovery: (q: string) => `/lis26/discovery?q=${encodeURIComponent(q)}`,
  profile: (id: string) => `/lis26/profiles/${id}`,
  company: (id: string) => `/lis26/company/${id}`,
  eventResponse: (id: string) => `/lis26/events/${id}/responses`,
};
