# API Map

## Critical finding: no JSON API

The Web Summit attendee app at `attend.websummit.com/lis26` is a **server-rendered Rails app using Turbo Streams**, not a JSON/GraphQL API. Every page returns HTML. There is no `api.*` subdomain, no `/graphql`, no `/json` endpoints. The only JSON on the page is third-party analytics (Amplitude, New Relic, Matomo, Clarity).

This means the data the app shows is embedded in HTML markup. To read it programmatically we must parse HTML — which violates the PLAN's "nothing should fetch websummit.com HTML" rule and is fragile.

## Endpoints observed (all HTML)

| Purpose | Method + path | Auth | Notes |
| --- | --- | --- | --- |
| Sign-in: request code | POST `/magic_links?slug=lis26` | cookie `_attendee_portal_session` + CSRF `authenticity_token` | form-encoded: `email`, `commit=Continue` |
| Poll login status | GET `/magic_links/check_login_status?slug=lis26&email=...` | same | returns empty body; polled every 5s |
| Verify OTP | POST `/magic_links/verify_otp?slug=lis26` | same | form: `magic_link_id`, `email`, `otp`, `commit=Verify` |
| Logout | POST `/magic_links/logout?slug=lis26` | same | |
| Schedule (all events) | GET `/dl/lis26/schedule` → 302 → `/lis26/schedule?active_tab=available-events&tracks[]=6` | `EXP_..._identity` cookie | HTML; query params: `active_tab`, `tracks[]`, `day`, `search` |
| My schedule | GET `/lis26/schedule` (HTML, contains `my-schedule-events-content` div) | same | bookmarked sessions rendered inline |
| Event detail | GET `/lis26/events/:event_id?active_tab=available-events` | same | HTML |
| Set response (Going/Interested) | POST `/lis26/events/:event_id/responses` | same | form: `response=going` |
| Discovery (attendees/companies) | GET `/lis26/discovery` | same | HTML; search/filter forms |
| Attendee profile | GET `/lis26/profiles/:profile_id` | same | HTML; has `meeting_modal` POST form |
| Tickets | GET `/lis26/tickets` | same | HTML |
| Invitations | GET `/lis26/invitations` | same | HTML |
| Jobs & perks | GET `/lis26/jobs_perks` | same | HTML |
| Documents | GET `/lis26/documents` | same | HTML |
| Personal schedule (.ics) | GET `/lis26/personal_schedule/:token/email_calendar` | same | likely ICS download |
| Settings | GET `/lis26/settings` | same | HTML |
| Edit profile | GET `/lis26/profiles/:id/edit` | same | HTML |

## Auth mechanism

- Cookie `_attendee_portal_session` (session cookie, Rails signed/encrypted) — present before sign-in.
- Cookie `EXP_<app_id>_identity` — set after verify_otp. Base64-URL-encoded JSON containing `web_exp_id_v2` (a UUID) and `first_seen` (epoch). This is the auth cookie for the app; it is sent on every `/lis26/*` request.
- CSRF token: `authenticity_token` hidden field in every form; required on all POSTs.
- No `Authorization` header, no JWT, no bearer token. No token refresh observed (session cookie persists).
- `check_login_status` returns empty 200 while pending, then 303 redirect after OTP verified.

## Pagination / search

- No cursor/offset pagination. The schedule page renders a fixed grid of event cards (~16 visible) and uses Turbo Streams to swap content when filters change. No infinite-scroll JSON endpoint was captured.
- Search is a full-page GET (query params in URL), returning filtered HTML.

## Required custom headers

None beyond the cookies. User-Agent is the browser default.

## Guardrail 3 status

No CAPTCHA, no device attestation, no certificate pinning, no request signing. Sign-in is plain form POSTs. **Path A (direct sign-in) is viable.**