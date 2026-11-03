# Selectors used to parse the attendee app's HTML.
#
# The app is server-rendered, so every tool result depends on these CSS
# selectors. If markup changes, update the matching entry here and in
# src/api/parse*.ts, then re-run `npm test`.
#
# Each entry: selector → what it extracts.

## Schedule page (`/lis26/schedule`)
| Selector | Extracts |
| --- | --- |
| `.event-card` | Each session card |
| `.event-content` (anchor inside card) | Session URL, from which the id is parsed |
| `h4` inside card | Session title |
| `.text-muted span` | Day + time text (may be combined) |
| `.bi-geo-alt` → closest `span` | Stage / location |
| `.bi-list` → closest `span` | Track |
| `.line-clamp-3` | Short description |
| `#my-schedule-events-content [id^="my-schedule-event-"]` | Bookmarked sessions |

## Event detail page (`/lis26/events/:id`)
| Selector | Extracts |
| --- | --- |
| `.event-content` / `#event-info-card` | Main info block |
| `p.h1` | Title |
| `.text-gray-700` spans | "Mon, 09 Nov" + "6:00 PM - 8:00 PM" |
| `.badge-secondary` | Stage / track / format |
| `.fs-5.fw-light` | Full description |
| `.event-card-speaker` | Speakers |

## Attendee profile (`/lis26/profiles/:id`)
| Selector | Extracts |
| --- | --- |
| `.profile-name` | Full name |
| `.fw-medium` (in profile card) | Company |
| `span` with `iconoir-map-pin` | Location |
| `.profile-card--content p` | Bio |
| `attendee?id=` in HTML | Profile UUID (survives link redaction) |

## Discovery page (`/lis26/discovery`)
| Selector | Extracts |
| --- | --- |
| `.company-card` | Company card |
| `a[href*="/company/"]` | Company URL + id |
| `img` inside card | Logo |

## Auth
| Selector | Extracts |
| --- | --- |
| `name="authenticity_token"` | CSRF token (required on all POSTs) |
| `name="magic_link_id"` | OTP form's magic link id |
