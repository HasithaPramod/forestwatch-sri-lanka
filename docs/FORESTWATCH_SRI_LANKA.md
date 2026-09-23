# FORESTWATCH SRI LANKA

## National Tree Planting, Geo-Monitoring, Community Verification & ForestQuest Platform

**Project Type:** Cross-Platform Government / Environmental Monitoring Platform
**Target Platforms:** Web, Android, iOS
**Development Approach:** Free-first infrastructure, scalable architecture
**Primary Development Tool:** Cursor
**Primary Language:** TypeScript

---

# 1. PROJECT VISION

Build a production-oriented cross-platform digital platform for Sri Lankan tree-planting, forest-restoration and long-term environmental monitoring campaigns.

The platform should allow:

* Forest Department officers
* Citizens
* Volunteers
* Schools
* Universities
* NGOs
* Government organizations
* Private organizations
* Community groups

to participate in tree planting and long-term monitoring.

The system must not only count how many trees were planted.

It must help answer:

* Where were they planted?
* When were they planted?
* What species were planted?
* How many were planted?
* Who registered the plantation?
* Has the plantation been verified?
* Are the trees still alive?
* What condition are they currently in?
* When was the location last inspected?
* What photographs exist over time?
* What problems have been reported?
* Which Forest Department officer verified the information?

Core lifecycle:

PLANT
↓
REGISTER
↓
LOCATE
↓
MONITOR
↓
VERIFY
↓
PROTECT
↓
ENGAGE COMMUNITY

---

# 2. SYSTEM COMPONENTS

Build one ecosystem containing:

1. Public website
2. Citizen web application
3. Volunteer web application
4. Organization portal
5. Forest Officer portal
6. Administration portal
7. Android application
8. iOS application
9. Central REST API
10. PostgreSQL/PostGIS database
11. Object/image storage
12. Notification infrastructure
13. Offline synchronization system
14. GIS/map system
15. ForestQuest engagement engine

All applications must communicate through the same backend API.

Protected database operations must not be performed directly from browser/mobile clients.

Architecture:

```text
                 ┌──────────────────┐
                 │    Next.js Web   │
                 └────────┬─────────┘
                          │
                          ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Android App  │───▶│  NestJS API  │◀───│   iOS App    │
│ Expo / RN    │    │              │    │ Expo / RN    │
└──────────────┘    └──────┬───────┘    └──────────────┘
                           │
            ┌──────────────┼───────────────┐
            ▼              ▼               ▼
      PostgreSQL       PostGIS        StorageProvider
                                            │
                                    Supabase Storage
                                      Phase 1
```

---

# 3. MONOREPO

Use:

* pnpm
* Turborepo
* TypeScript

Repository:

```text
forestwatch-sri-lanka/
│
├── apps/
│   ├── web/
│   ├── mobile/
│   └── api/
│
├── packages/
│   ├── database/
│   ├── types/
│   ├── validation/
│   ├── api-client/
│   ├── auth/
│   ├── sri-lanka-locations/
│   ├── engagement/
│   ├── config/
│   └── utils/
│
├── docker/
│
├── docs/
│   ├── architecture.md
│   ├── database.md
│   ├── api.md
│   ├── authentication.md
│   ├── gis.md
│   ├── storage.md
│   ├── offline-sync.md
│   ├── forestquest.md
│   └── deployment.md
│
├── .env.example
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

# 4. WEB TECHNOLOGY

Use:

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* TanStack Query
* React Hook Form
* Zod
* Leaflet
* React Leaflet

Requirements:

* Responsive
* Mobile-first
* Accessible
* Multilingual
* SEO-friendly public pages
* Optimized image loading
* Server-side authorization where appropriate

---

# 5. MOBILE TECHNOLOGY

Use:

* React Native
* Expo
* Expo Router
* TypeScript
* NativeWind
* TanStack Query
* React Hook Form
* Zod
* React Native Maps
* Expo Location
* Expo Camera / Image Picker
* Expo Notifications
* Expo SecureStore
* SQLite

Target:

* Android
* iOS

Do NOT create a WebView wrapper.

The mobile application is a genuine field application.

Native capabilities:

* GPS
* Camera
* Local database
* Push notifications
* Offline forms
* Offline image queue
* Background/resumable synchronization where practical

---

# 6. BACKEND

Use:

* Node.js
* NestJS
* TypeScript
* REST API
* Swagger/OpenAPI
* PostgreSQL
* PostGIS

Use Prisma where appropriate.

Use safe PostGIS-native SQL for advanced spatial operations where necessary.

API prefix:

```text
/api/v1
```

Backend is the source of truth.

---

# 7. FREE-FIRST INFRASTRUCTURE

Initial development must be possible using free/local infrastructure.

Initial options:

## Database

Supabase PostgreSQL Free Tier

OR

Local PostgreSQL/PostGIS Docker

## GIS

PostGIS

## Images

Supabase Storage Free Tier

## Local Infrastructure

Docker / Docker Compose

## Web Map

Leaflet + OpenStreetMap during development.

## Mobile

Expo development environment.

Avoid introducing paid services during initial development where reasonable free/local alternatives exist.

Free-tier quotas must not be treated as unlimited production infrastructure.

---

# 8. STORAGE ABSTRACTION

Do not tightly couple application business logic to Supabase.

Create:

```typescript
interface StorageProvider {
    upload(...): Promise<StoredFile>;
    delete(key: string): Promise<void>;
    getUrl(key: string): Promise<string>;
    getSignedUrl?(key: string): Promise<string>;
}
```

Implement initially:

```text
LocalStorageProvider
SupabaseStorageProvider
```

Design for future:

```text
S3StorageProvider
```

Architecture:

```text
MonitoringService
       │
       ▼
StorageService
       │
       ├── LocalStorageProvider
       ├── SupabaseStorageProvider
       └── S3StorageProvider (future)
```

Never call Supabase directly throughout plantation business logic.

---

# 9. IMAGE MANAGEMENT

Images will become one of the largest system resources.

Optimize before permanent storage.

Normal monitoring image target:

```text
Maximum long edge: approximately 1600px
```

Thumbnail:

```text
300–500px
```

Preferred optimized format:

```text
WebP
```

where appropriate.

Validate:

* MIME
* extension
* actual file signature where practical
* dimensions
* maximum size

Implement:

* Compression
* Thumbnail generation
* Lazy loading
* Orphan cleanup strategy

Never store image binary data inside PostgreSQL.

Database stores:

* storage provider
* object key
* URL/public representation where appropriate
* MIME
* width
* height
* size
* uploader
* timestamps

---

# 10. SRI LANKAN ADMINISTRATIVE DATA

Integrate npm package:

```text
sl-gnd-dsd-districts
```

Hierarchy:

```text
Province
   ↓
District
   ↓
Divisional Secretariat Division
   ↓
Grama Niladhari Division
```

Create reusable shared package:

```text
packages/sri-lanka-locations
```

Support:

* English
* Sinhala
* Tamil

Store stable administrative codes where available rather than relying only on names.

Web and mobile must reuse the same location-domain logic.

---

# 11. GPS VS ADMINISTRATIVE LOCATION

Treat them independently.

Plantation may have:

```text
latitude
longitude
geometry
```

and:

```text
provinceCode
districtCode
dsdCode
gndCode
```

Do not assume user-selected administrative information is correct solely because GPS coordinates exist.

Architecture should permit future boundary validation.

---

# 12. USER ROLES

Implement RBAC.

Roles:

```text
GUEST
CITIZEN
VOLUNTEER
ORGANIZATION_MANAGER
FOREST_OFFICER
ADMIN
SUPER_ADMIN
```

---

# 13. GUEST PERMISSIONS

Guest can:

* View homepage
* Explore public map
* View campaigns
* View plantations
* View approved monitoring history
* View public images
* Read public comments
* View public statistics
* Search
* Filter

Guest cannot submit information.

---

# 14. CITIZEN PERMISSIONS

Citizen can:

* Register
* Login
* Manage profile
* Join campaigns
* Submit eligible plantation records
* Submit monitoring updates
* Upload photographs
* Comment
* Reply
* Report issues
* View contributions
* Participate in ForestQuest
* Earn verified XP
* Unlock badges
* Build Forest Passport

---

# 15. VOLUNTEER

Includes citizen permissions plus campaign/volunteer functionality.

---

# 16. ORGANIZATION MANAGER

Can manage approved organization activities.

Examples:

* Plantation projects
* Organization contributors
* Monitoring submissions
* Organization analytics

---

# 17. FOREST OFFICER

Can:

* Review plantation submissions
* Verify plantations
* Reject invalid submissions
* Verify monitoring updates
* Reject monitoring updates
* Request corrections
* Perform official inspections
* Review reports
* Manage assigned geographic region
* View officer analytics

---

# 18. ADMIN

Can manage:

* Users
* Officers
* Organizations
* Campaigns
* Plantations
* Species
* Comments
* Reports
* Analytics
* ForestQuest configuration
* Moderation
* Settings

Can view audit logs.

---

# 19. SUPER ADMIN

Full system configuration and administration.

All permissions must be enforced server-side.

---

# 20. AUTHENTICATION

Implement:

* Registration
* Login
* Logout
* Email verification
* Forgot password
* Reset password
* Access token
* Refresh token
* Refresh token rotation
* Device/session management

Use:

```text
Argon2 preferred
```

or secure bcrypt configuration.

Never store plaintext passwords.

---

# 21. CAMPAIGNS

Campaign fields:

```text
id
name
slug
description
bannerImage
organizer
startDate
endDate
targetTrees
targetArea
eligibleLocations
status
visibility
createdBy
createdAt
updatedAt
```

Statuses:

```text
DRAFT
UPCOMING
ACTIVE
COMPLETED
ARCHIVED
```

---

# 22. PLANTATION MODEL

Do NOT assume:

```text
1 tree = 1 marker
```

Support:

```text
INDIVIDUAL_TREE
PLANTATION_SITE
```

Example:

```text
Bundala Restoration Site 04

Trees:
1,250

Area:
2.4 hectares

Species:
Kumbuk
Palu
Weera
```

Plantation fields:

```text
id
campaignId
name
description
type
latitude
longitude
geometry
provinceCode
districtCode
dsdCode
gndCode
plantingDate
treeCount
areaHectares
organizationId
createdBy
verificationStatus
locationVisibility
createdAt
updatedAt
```

---

# 23. POSTGIS

Support:

```text
POINT
POLYGON
MULTIPOLYGON
```

Use appropriate SRID.

Create spatial indexes.

Support:

* Nearby plantations
* Radius search
* Bounding-box search
* Viewport search
* Distance calculation
* Geographic containment
* Plantation area

---

# 24. TREE SPECIES

Create species database.

Fields:

```text
id
commonEnglishName
sinhalaName
tamilName
scientificName
nativeStatus
description
image
active
```

Relationship:

```text
Plantation
     │
     ▼
PlantationSpecies
     │
     ▼
Species
```

PlantationSpecies:

```text
plantationId
speciesId
quantity
```

---

# 25. PUBLIC MAP

Route:

```text
/map
```

Features:

* Current location
* Markers
* Plantation polygons
* Marker clustering
* Zoom
* Pan
* Search
* Filters
* Popup preview

Filters:

```text
Campaign
Province
District
DSD
GND
Species
Year
Verification
Health
```

Never download every plantation record for map rendering.

Use:

```text
GET /api/v1/map/plantations?bbox=...
```

---

# 26. PLANTATION DETAIL

Route:

```text
/plantations/{id}
```

Display:

* Name
* Campaign
* Main image
* Gallery
* Map
* Administrative area
* Tree count
* Area
* Species
* Planting date
* Organization
* Verification
* Current health
* Monitoring timeline
* Comments
* Reports where appropriate
* ForestQuest discovery information

---

# 27. NEARBY

Mobile feature:

```text
Plantations Near Me
```

Flow:

```text
GPS
 ↓
API
 ↓
PostGIS
 ↓
Nearby locations
```

Display distance.

Example:

```text
Bundala Site
120m

Community Forest
640m

Restoration Zone
1.4km
```

Support:

* List
* Map

---

# 28. MONITORING

Never overwrite historical monitoring records.

Timeline:

```text
Planting
   ↓
3-month observation
   ↓
6-month inspection
   ↓
12-month inspection
   ↓
Long-term monitoring
```

---

# 29. MONITORING UPDATE

Fields:

```text
id
plantationId
userId
timestamp
latitude
longitude
gpsAccuracy
distanceFromPlantation
locationValidation
healthStatus
estimatedSurvivingTrees
estimatedDeadTrees
estimatedHeight
observation
verificationStatus
createdAt
```

Health:

```text
HEALTHY
FAIR
STRESSED
DAMAGED
PARTIALLY_DEAD
DEAD
MISSING
UNKNOWN
```

---

# 30. GEO-PROXIMITY

When submitting an on-site observation:

Mobile captures:

```text
GPS
GPS accuracy
timestamp
```

Backend calculates distance.

Never trust client-calculated distance.

Possible statuses:

```text
ON_SITE
NEARBY
REMOTE
LOCATION_UNAVAILABLE
```

Initial configurable example:

```text
0–100m = ON_SITE
100–500m = NEARBY
>500m = REMOTE
```

Do not hard-code these thresholds.

GPS is not absolute evidence.

It can potentially be spoofed.

Use GPS together with:

* photographs
* timestamp
* account reputation
* monitoring history
* community evidence
* officer verification

---

# 31. COMMUNITY UPDATES

Authenticated user can:

```text
Visit plantation
      ↓
Open location
      ↓
Capture GPS
      ↓
Take photograph
      ↓
Select condition
      ↓
Write observation
      ↓
Submit
```

Record:

```text
User
GPS
GPS accuracy
Distance
Time
Photographs
Condition
Observation
```

---

# 32. BEFORE/AFTER

Provide chronological visual comparison.

Example:

```text
PLANTING DAY
[IMAGE]

3 MONTHS
[IMAGE]

6 MONTHS
[IMAGE]

12 MONTHS
[IMAGE]
```

---

# 33. COMMENTS

Authenticated users can comment.

Support:

* Replies
* Helpful reaction
* Officer badge
* Report comment
* Moderation

Do not allow anonymous posting.

---

# 34. REPORTS

Categories:

```text
DEAD_TREES
DAMAGED_TREES
FIRE_DAMAGE
ILLEGAL_CUTTING
MISSING_TREES
WATER_SHORTAGE
PEST_DISEASE
INCORRECT_INFORMATION
OTHER
```

Workflow:

```text
OPEN
 ↓
UNDER_REVIEW
 ↓
ACTION_REQUIRED
 ↓
RESOLVED
```

Alternative:

```text
REJECTED
```

---

# 35. VERIFICATION

Plantation:

```text
SUBMITTED
 ↓
UNDER_REVIEW
 ↓
VERIFIED
```

or:

```text
REJECTED
```

Monitoring:

```text
PENDING
VERIFIED
REJECTED
```

Store verification history.

Never simply overwrite previous verification decisions.

---

# 36. OFFICER INSPECTIONS

Officer inspection fields:

```text
officer
plantation
date
GPS
GPS accuracy
images
estimatedTreeCount
estimatedSurvival
condition
notes
recommendedAction
```

Officer inspections must be visually different from citizen observations.

---

# 37. SURVIVAL MONITORING

Example:

```text
Initially planted:
1,000

6 months:
920

12 months:
870

Estimated survival:
87%
```

Maintain historical estimates.

Dashboard must distinguish:

```text
Recorded Trees
Verified Trees
Estimated Surviving Trees
```

---

# 38. OFFLINE MOBILE MODE

Critical requirement.

Use SQLite.

Offline functionality:

* Cached plantations
* GPS
* Camera
* Monitoring forms
* Inspection forms
* Reports
* Drafts

Statuses:

```text
LOCAL_DRAFT
QUEUED
SYNCING
SYNCED
SYNC_FAILED
```

Use client UUID.

Synchronization must be idempotent.

Retries must not duplicate records.

---

# 39. OFFLINE IMAGE QUEUE

Flow:

```text
Take photo offline
      ↓
Store locally
      ↓
Create local monitoring record
      ↓
Network available
      ↓
Upload image
      ↓
Create/update server record
      ↓
Confirm
      ↓
Mark SYNCED
```

Do not delete local evidence before successful server synchronization.

---

# 40. NOTIFICATIONS

Support:

* Push
* In-app

Examples:

```text
Campaign started
Plantation verified
Monitoring verified
Correction requested
Comment reply
Officer report assignment
Inspection reminder
ForestQuest mission
Guardian reminder
Badge unlocked
```

---

# 41. FORESTQUEST

Create an original location-based environmental engagement system inspired by exploration games.

Do NOT copy Pokémon names, characters, graphics, branding, terminology or protected assets.

ForestQuest is based on:

```text
EXPLORE
 ↓
DISCOVER
 ↓
LEARN
 ↓
MONITOR
 ↓
PROTECT
 ↓
EARN
 ↓
BUILD FOREST PASSPORT
```

The purpose is community environmental engagement.

It must not interfere with official Forest Department verification.

---

# 42. FORESTQUEST ARCHITECTURE

Keep engagement separate from core environmental records.

Architecture:

```text
Plantations
     │
Monitoring
     │
Campaigns
     │
Verification
     │
     ▼
Verified Domain Events
     │
     ▼
FORESTQUEST ENGINE
     │
 ┌───┼────────┬─────────┬──────────┐
 ▼   ▼        ▼         ▼          ▼
XP  Badges  Missions  ForestDex  Streaks
 │
 ▼
Levels
 │
 ▼
Forest Passport
```

Do NOT put code like:

```text
user.xp += 100
```

throughout unrelated controllers.

Create centralized EngagementService/Event processing.

---

# 43. VERIFIED ENGAGEMENT EVENTS

Examples:

```text
PLANTATION_DISCOVERED
MONITORING_SUBMITTED
MONITORING_VERIFIED
PLANTATION_REGISTERED
PLANTATION_VERIFIED
SPECIES_DISCOVERED
CAMPAIGN_JOINED
CAMPAIGN_COMPLETED
OFFICIAL_EVENT_PARTICIPATED
REPORT_VERIFIED
STEWARD_REVISIT_VERIFIED
```

Rewards should generally be finalized after appropriate verification.

---

# 44. XP

Create environmental experience points.

Example configurable rules:

```text
First plantation discovered     +50 XP
New species discovered          +75 XP
Monitoring submitted            provisional XP
Monitoring verified             +100 XP
Verified issue report           +150 XP
Official planting participation +300 XP
3-month stewardship revisit     +200 XP
```

Never hard-code reward values throughout the application.

Store reward configuration centrally.

---

# 45. ANTI-FARMING

Prevent XP abuse.

Do not allow repeated meaningless actions to generate unlimited XP.

Implement:

* Cooldowns
* Duplicate detection
* Verification
* Daily/weekly caps where appropriate
* Location checks
* Same-site restrictions
* Suspicious activity detection
* Rate limits

Example:

Uploading 100 photographs of the same plantation within minutes must not generate 100 independent rewards.

---

# 46. LEVELS

Initial level concept:

```text
Level 1 — Seedling
Level 2 — Sprout
Level 3 — Tree Guardian
Level 4 — Eco Explorer
Level 5 — Forest Ranger
Level 6 — Forest Champion
```

Exact XP thresholds must be configuration/data-driven.

Game level must NEVER imply Forest Department employment, legal authority or official certification.

Consider alternative wording if "Forest Ranger" could create confusion with an official role.

---

# 47. FORESTDEX

Create a species-discovery journal.

Name:

```text
ForestDex
```

Example:

```text
FORESTDEX

23 / 150 species

Kumbuk       ✓
Na           ✓
Mee          ✓
Palu         ✓
Ebony        🔒
```

Species entry can display:

* English name
* Sinhala name
* Tamil name
* Scientific name
* Native status
* Educational description
* Identification information
* User discovery date
* Discovery location with privacy controls
* Number of verified encounters

---

# 48. SPECIES DISCOVERY

A species should not automatically be permanently discovered merely because the user clicked a map marker remotely.

Discovery can require a valid interaction.

Possible requirements:

```text
Visit plantation
+
acceptable GPS proximity
+
registered species exists at site
+
valid interaction
```

For sensitive species/sites, exact discovery locations must remain protected.

---

# 49. FOREST PASSPORT

Every participating user gets a Forest Passport.

Example:

```text
FOREST PASSPORT

Kesara

Tree Guardian — Level 8

EcoPoints:          4,850
Sites Discovered:      18
Species:               27
Observations:          43
Verified:              39
Badges:                 8
```

Show district exploration progress.

Provide shareable public profile only when user privacy settings permit it.

Never expose private personal information.

---

# 50. ECOPOINTS

Create:

```text
EcoPoints
```

EcoPoints are initially non-monetary reputation/engagement points.

Do NOT implement:

* cryptocurrency
* transferable tokens
* cash conversion
* gambling mechanics

without a separate future requirements/legal review.

EcoPoints must not affect official verification authority.

---

# 51. BADGES

Example badges:

```text
First Plant
First Discovery
First Verified Observation
10 Species
25 Species
Field Explorer
Community Guardian
6-Month Steward
12-Month Steward
Campaign Champion
Restoration Helper
```

Badge requirements must be configurable.

---

# 52. STEWARDSHIP STREAKS

Avoid meaningless daily login streaks.

Reward real environmental stewardship.

Example:

```text
Month 1 ✓
Month 2 ✓
Month 3 ✓
Month 4 ✓

4-month stewardship streak
```

A qualifying activity may include a verified plantation revisit or other configured stewardship action.

---

# 53. MISSIONS

Mission types:

```text
DAILY
WEEKLY
CAMPAIGN
LOCATION
SPECIES
COMMUNITY
STEWARDSHIP
RESCUE
```

Examples:

```text
Visit one nearby plantation

Submit one valid monitoring observation

Discover a new native species

Participate in official campaign

Revisit adopted plantation

Help monitor two plantations this month
```

---

# 54. FOREST RESCUE MISSIONS

Officer/admin-approved issues can create community missions.

Example:

```text
FOREST RESCUE

Site:
HMB-0241

Problem:
Possible water shortage

Last monitored:
4 days ago

Required:
Updated condition photographs
```

Only expose missions appropriate and safe for public participation.

Never direct citizens into:

* Restricted areas
* Dangerous areas
* Fire zones
* Active enforcement operations
* Environmentally sensitive areas not open to public access

---

# 55. PLANTATION GUARDIANSHIP

Users can become a guardian/follower of an eligible plantation.

Example:

```text
MY FOREST

Bundala Site #04
Healthy
Last update: 18 days ago

Community Forest #12
Needs monitoring
Last update: 76 days ago
```

Allow notifications such as:

```text
Your followed plantation has not received
a monitoring update for 90 days.
```

Do not imply legal ownership of the plantation.

Use terminology such as:

```text
Guardian
Follow
Steward
```

rather than ownership.

---

# 56. DISTRICT EXPLORATION

Use administrative location data to provide exploration progress.

Example:

```text
Hambantota     100%
Matara          70%
Galle           50%
Monaragala      20%
```

Do not require visiting every administrative division.

Progress should be based on meaningful verified activities.

---

# 57. COMMUNITY CHALLENGES

Support cooperative challenges.

Example:

```text
HAMBANTOTA MONITORING CHALLENGE

Goal:
500 plantation sites monitored

Progress:
347 / 500

Contributors:
1,248
```

Possible scopes:

* National
* Province
* District
* Organization
* School
* University
* Campaign

---

# 58. SCHOOL / UNIVERSITY CHALLENGES

Organizations can participate in approved challenges.

Example:

```text
GREEN SCHOOL CHALLENGE

Target:
1,000 trees

Recorded:
780

Verified:
730

Estimated surviving:
693
```

Do not rank official environmental success solely using raw planting counts.

Survival and verification should be visible separately.

---

# 59. FORESTQUEST DATABASE

Create appropriate entities.

At minimum consider:

```text
engagement_profiles

xp_transactions

badges

user_badges

missions

mission_tasks

user_missions

species_discoveries

plantation_discoveries

plantation_guardians

stewardship_streaks

community_challenges

challenge_progress
```

Do not simply add dozens of unrelated columns to users.

---

# 60. XP TRANSACTION LEDGER

Never only store:

```text
users.xp = 4850
```

Maintain ledger.

Example:

```text
xp_transactions

id
userId
eventType
eventId
amount
status
reason
createdAt
```

Possible statuses:

```text
PENDING
CONFIRMED
REVOKED
```

This allows anti-fraud corrections and auditing.

---

# 61. ENGAGEMENT SECURITY

Do not trust clients to submit:

```text
XP
Badge unlocked
Mission completed
Species discovered
Level
EcoPoints
```

Client sends environmental/community action.

Server evaluates whether reward conditions are satisfied.

---

# 62. GAMIFICATION SAFETY

Do not encourage unsafe behavior.

Do not reward:

* Trespassing
* Entering protected restricted areas
* Driving while interacting with app
* Visiting dangerous areas
* Approaching wildlife
* Manipulating sensitive ecological sites

Show appropriate safety messages.

Sensitive locations can be excluded entirely from ForestQuest.

---

# 63. LOCATION PRIVACY

Implement:

```text
PUBLIC_EXACT
PUBLIC_APPROXIMATE
OFFICER_ONLY
```

PUBLIC_APPROXIMATE must be enforced at API/DTO level.

Do not return exact coordinates and merely hide them on the map.

ForestQuest must respect these restrictions.

---

# 64. SEARCH

Global search:

* Plantation
* Campaign
* District
* DSD
* GND
* Organization
* Species

Use server-side search and pagination.

---

# 65. PUBLIC DASHBOARD

Show:

```text
Trees Recorded
Verified Trees
Estimated Surviving Trees
Plantation Sites
Campaigns
Organizations
Contributors
Verified Monitoring Updates
```

Charts:

* Trees by year
* Trees by district
* Trees by species
* Survival trends
* Campaign progress

---

# 66. USER DASHBOARD

Show:

```text
My Contributions
My Plantations
My Monitoring Updates
My Reports
My ForestQuest Profile
Forest Passport
XP
EcoPoints
Badges
Missions
ForestDex
Guarded Plantations
Notifications
```

---

# 67. OFFICER DASHBOARD

Show:

* Assigned region
* Pending plantation reviews
* Pending monitoring reviews
* Reports
* Upcoming inspections
* Recent activity
* Assigned plantation map

ForestQuest metrics should not interfere with officer verification decisions.

---

# 68. ADMIN DASHBOARD

Show:

* Users
* Officers
* Organizations
* Campaigns
* Trees
* Plantation sites
* Pending verification
* Reports
* System activity
* Storage usage when available
* ForestQuest activity
* Suspicious engagement activity

Analytics:

```text
Province
District
DSD
GND
Campaign
Species
Year
```

---

# 69. INTERNATIONALIZATION

Support:

```text
English
Sinhala
Tamil
```

Use:

```text
locales/
    en.json
    si.json
    ta.json
```

Do not hard-code user-facing strings.

Remember language preference.

---

# 70. ACCESSIBILITY

Target WCAG 2.1 AA where practical.

Implement:

* Semantic HTML
* Keyboard navigation
* Form labels
* Visible focus
* Accessible errors
* Screen reader support
* Appropriate ARIA
* Adequate contrast

---

# 71. SECURITY

Implement:

* HTTPS production requirement
* Secure password hashing
* JWT
* Refresh rotation
* RBAC
* Server authorization
* Input validation
* Rate limiting
* Secure headers
* CORS
* CSRF where applicable
* XSS mitigation
* SQL injection protection
* Upload validation
* Authentication throttling
* Secret management

Never trust:

```text
Frontend role
Frontend user ID
Client GPS
Client distance
Client verification status
Client XP
Client EcoPoints
Client mission completion
EXIF GPS
```

---

# 72. AUDIT LOGS

Track important operations.

Examples:

```text
CAMPAIGN_CREATED
PLANTATION_CREATED
PLANTATION_VERIFIED
PLANTATION_REJECTED
MONITORING_VERIFIED
REPORT_RESOLVED
USER_ROLE_CHANGED
OFFICER_ASSIGNED
XP_REVOKED
MISSION_CREATED
ENGAGEMENT_ACCOUNT_FLAGGED
```

Audit logs must not be editable through normal administration UI.

---

# 73. CORE DATABASE TABLES

At minimum:

```text
users
roles
user_roles
sessions

organizations
officer_assignments

campaigns

plantations
species
plantation_species
plantation_images

monitoring_updates
monitoring_images

comments
comment_reactions

reports
report_images

verifications

notifications
notification_preferences

audit_logs

engagement_profiles
xp_transactions
badges
user_badges
missions
mission_tasks
user_missions
species_discoveries
plantation_discoveries
plantation_guardians
stewardship_streaks
community_challenges
challenge_progress
```

---

# 74. DATABASE INDEXES

Consider normal indexes for:

```text
campaignId
districtCode
dsdCode
gndCode
verificationStatus
userId
organizationId
createdAt
speciesId
mission status
```

Use PostGIS GiST indexes for geometry.

Document important indexes.

---

# 75. API

Prefix:

```text
/api/v1
```

Authentication:

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
```

Campaigns:

```text
GET /campaigns
GET /campaigns/:id
POST /campaigns
PATCH /campaigns/:id
```

Plantations:

```text
GET /plantations
GET /plantations/:id
POST /plantations
PATCH /plantations/:id
```

Monitoring:

```text
GET /plantations/:id/updates
POST /plantations/:id/updates
```

Comments:

```text
GET /plantations/:id/comments
POST /plantations/:id/comments
```

Reports:

```text
POST /plantations/:id/reports
GET /reports
```

Maps:

```text
GET /map/plantations
```

Nearby:

```text
GET /nearby/plantations
```

Species:

```text
GET /species
GET /species/:id
```

Locations:

```text
GET /locations/provinces
GET /locations/districts
GET /locations/dsds
GET /locations/gnds
```

ForestQuest:

```text
GET /engagement/profile
GET /engagement/passport

GET /engagement/missions
GET /engagement/missions/:id

GET /engagement/badges

GET /engagement/forestdex

GET /engagement/discoveries

GET /engagement/guardians

POST /plantations/:id/follow
DELETE /plantations/:id/follow

GET /engagement/challenges
GET /engagement/challenges/:id
```

Do not provide an API such as:

```text
POST /add-xp
```

for ordinary clients.

XP must result from server-evaluated actions.

---

# 76. API RESPONSE

Success:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  }
}
```

Never expose production stack traces.

---

# 77. PAGINATION

Use consistent pagination.

Example:

```text
?page=1&limit=20
```

Metadata:

```json
{
  "page": 1,
  "limit": 20,
  "total": 1000,
  "totalPages": 50
}
```

Enforce maximum limits.

---

# 78. PERFORMANCE

Targets where practical:

```text
Ordinary API:
<500ms

Initial web load:
<3 seconds under expected conditions
```

Use:

* Pagination
* Database indexes
* Spatial indexes
* Image optimization
* Caching
* Lazy loading
* Map clustering
* Bounding-box queries

---

# 79. SCALE

Architecture should support future growth toward:

```text
100,000+ users

100,000+ plantation sites

1,000,000+ tree records

Millions of photographs
```

Do not design endpoints that retrieve complete tables.

---

# 80. TESTING

Implement:

* Unit
* Integration
* API
* Component
* E2E

Critical tests:

```text
Authentication

RBAC

Officer geographic authorization

Campaign CRUD

Plantation creation

PostGIS distance

Nearby search

Bounding-box map

Image validation

Monitoring

Verification

Reports

Comments

Offline synchronization

XP anti-duplication

XP verification

Species discovery

Mission completion

Badge unlocking

Guardian system

Sensitive location protection
```

---

# 81. DEVELOPMENT SEEDS

Create development-only accounts:

```text
Super Admin
Admin
Forest Officer
Citizen
Volunteer
Organization Manager
```

Seed:

* Campaigns
* Plantations
* Species
* Monitoring
* Reports
* Comments
* Missions
* Badges
* Challenges

Never use known development credentials in production.

---

# 82. ENVIRONMENT

Create:

```text
.env.example
```

Variables:

```text
NODE_ENV=

DATABASE_URL=

JWT_SECRET=
JWT_REFRESH_SECRET=

STORAGE_PROVIDER=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=

NEXT_PUBLIC_API_URL=

EXPO_PUBLIC_API_URL=
```

Never expose:

```text
SUPABASE_SERVICE_ROLE_KEY
```

to browser/mobile.

---

# 83. DOCKER

Provide:

```text
docker-compose.yml
```

Local development:

```text
PostgreSQL/PostGIS
```

Optional:

```text
Redis
```

if architecture requires it.

---

# 84. WEB DESIGN

Visual direction:

* Modern
* Environmental
* Professional
* Government-grade
* Trustworthy
* Clean
* Accessible

Hero:

```text
Plant Today.
Protect Tomorrow.
```

Actions:

```text
Explore Plantations
Join a Campaign
```

Homepage:

* Hero
* National statistics
* Interactive map preview
* Active campaigns
* Recent monitoring
* How it works
* ForestQuest
* Organizations
* Environmental impact
* Footer

Do not create a generic AI-dashboard appearance.

---

# 85. PUBLIC NAVIGATION

```text
Home
Explore Map
Campaigns
Plantations
ForestQuest
Impact
About
Login
```

---

# 86. CITIZEN NAVIGATION

```text
Dashboard
Map
Nearby
Campaigns
My Contributions
ForestQuest
ForestDex
Missions
Passport
Notifications
Profile
```

---

# 87. MOBILE NAVIGATION

Primary tabs:

```text
Home
Map
Nearby
Quest
Profile
```

Primary contextual action:

```text
Add Update
```

Quest contains:

```text
Missions
ForestDex
Passport
Badges
Guardians
Challenges
```

---

# 88. OFFICER NAVIGATION

```text
Dashboard
Map
Inspections
Pending Verification
Reports
Plantations
Profile
```

---

# 89. ADMIN NAVIGATION

```text
Dashboard
Campaigns
Plantations
Users
Officers
Organizations
Species
Reports
Analytics
ForestQuest
Moderation
Audit Logs
Settings
```

---

# 90. FUNCTIONAL REQUIREMENTS

```text
FR-001 Registration
FR-002 Authentication
FR-003 Password recovery
FR-004 RBAC
FR-005 Profile
FR-006 Organization management
FR-007 Officer assignments
FR-008 Campaign CRUD
FR-009 Campaign participation
FR-010 Plantation registration
FR-011 Individual tree support
FR-012 Plantation site support
FR-013 Point GIS
FR-014 Polygon GIS
FR-015 GPS capture
FR-016 Province selection
FR-017 District selection
FR-018 DSD selection
FR-019 GND selection
FR-020 Species management
FR-021 Multiple species
FR-022 Images
FR-023 Public map
FR-024 Map filters
FR-025 Map search
FR-026 Bounding-box map
FR-027 Nearby plantations
FR-028 Distance calculation
FR-029 Plantation details
FR-030 Monitoring
FR-031 Monitoring photos
FR-032 Health status
FR-033 Survival estimates
FR-034 Monitoring timeline
FR-035 Before/after
FR-036 Comments
FR-037 Replies
FR-038 Reactions
FR-039 Reports
FR-040 Report workflow
FR-041 Verification
FR-042 Officer inspection
FR-043 Verification history
FR-044 Notifications
FR-045 Public dashboard
FR-046 Officer dashboard
FR-047 Admin dashboard
FR-048 Analytics
FR-049 Offline mode
FR-050 Offline synchronization
FR-051 Multilingual UI
FR-052 Audit logs
FR-053 Sensitive location protection
FR-054 Search
FR-055 Image optimization
FR-056 Storage abstraction
FR-057 ForestQuest profile
FR-058 XP
FR-059 XP ledger
FR-060 Levels
FR-061 Badges
FR-062 ForestDex
FR-063 Species discovery
FR-064 Plantation discovery
FR-065 Forest Passport
FR-066 Missions
FR-067 Mission progress
FR-068 Stewardship streaks
FR-069 Plantation guardians
FR-070 EcoPoints
FR-071 Community challenges
FR-072 District exploration
FR-073 Forest Rescue missions
FR-074 Anti-XP-farming
FR-075 Engagement moderation
```

---

# 91. NON-FUNCTIONAL REQUIREMENTS

```text
NFR-001 Web/Android/iOS

NFR-002 Responsive design

NFR-003 Strict TypeScript

NFR-004 Modular architecture

NFR-005 Secure authentication

NFR-006 Server-side RBAC

NFR-007 Privacy

NFR-008 Free-first infrastructure

NFR-009 Storage portability

NFR-010 GIS scalability

NFR-011 Offline capability

NFR-012 Idempotent synchronization

NFR-013 Multilingual support

NFR-014 Accessibility

NFR-015 Automated testing

NFR-016 Structured logging

NFR-017 Auditability

NFR-018 Image optimization

NFR-019 Pagination

NFR-020 Secret management

NFR-021 Error handling

NFR-022 Low-bandwidth support

NFR-023 Gamification anti-fraud

NFR-024 Location safety

NFR-025 Sensitive ecological location protection
```

---

# 92. DEVELOPMENT PHASES

Do NOT build the entire system at once.

Follow:

```text
PHASE 0
Architecture

PHASE 1
Monorepo + free/local infrastructure

PHASE 2
Database + PostGIS

PHASE 3
Authentication + RBAC

PHASE 4
Sri Lankan locations

PHASE 5
Campaigns

PHASE 6
Species

PHASE 7
Plantations

PHASE 8
Storage/images

PHASE 9
GIS/maps

PHASE 10
Monitoring

PHASE 11
Community/comments

PHASE 12
Reports

PHASE 13
Verification/officer inspections

PHASE 14
Mobile field functionality

PHASE 15
Offline synchronization

PHASE 16
Notifications

PHASE 17
Dashboards/analytics

PHASE 18
Internationalization

PHASE 19
ForestQuest foundation

PHASE 20
ForestDex/discovery

PHASE 21
Missions/badges/XP

PHASE 22
Guardians/streaks/challenges

PHASE 23
Engagement anti-fraud

PHASE 24
Security hardening

PHASE 25
Performance/testing

PHASE 26
Production readiness
```

---

# 93. PHASE 0

Before coding:

Inspect repository.

Produce:

1. Architecture
2. Folder structure
3. Database proposal
4. API modules
5. Dependencies
6. Environment variables
7. Security model
8. GIS strategy
9. Storage strategy
10. Offline strategy
11. ForestQuest event architecture
12. Testing strategy
13. Technical risks

Resolve architectural contradictions first.

---

# 94. PHASE 1

Set up:

```text
pnpm
Turborepo
Next.js
Expo
NestJS
Shared packages
TypeScript
ESLint
Prettier
Docker
PostgreSQL/PostGIS
StorageProvider
LocalStorageProvider
Supabase configuration
Environment validation
README
```

Verify:

```text
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Do not continue with broken builds.

---

# 95. DEVELOPMENT WORKFLOW

Every phase:

```text
ANALYZE
   ↓
PLAN
   ↓
IMPLEMENT
   ↓
MIGRATE
   ↓
TEST
   ↓
TYPECHECK
   ↓
LINT
   ↓
FIX
   ↓
DOCUMENT
   ↓
COMMIT-READY
```

---

# 96. DEFINITION OF DONE

A UI is not a completed feature.

Example:

```text
Submit Monitoring Update
```

is complete only when it actually performs:

```text
Form
 ↓
Validation
 ↓
Authentication
 ↓
Authorization
 ↓
GPS capture
 ↓
Server GPS validation
 ↓
Image processing
 ↓
Storage upload
 ↓
Database transaction
 ↓
Monitoring record
 ↓
Audit/event
 ↓
Engagement evaluation
 ↓
API response
 ↓
UI refresh
```

Never show fake success messages for unimplemented backend operations.

---

# 97. CURSOR CODING RULES

Mandatory:

1. Read existing code before architectural changes.

2. Do not create fake functionality.

3. Do not claim UI-only features are complete.

4. Avoid TODO placeholders for core functionality.

5. Backend is source of truth.

6. Enforce permissions server-side.

7. Never trust client GPS.

8. Never trust client distance.

9. Never trust client XP.

10. Never trust client mission completion.

11. Never expose secrets.

12. Validate external input.

13. Use transactions where appropriate.

14. Preserve monitoring history.

15. Preserve verification history.

16. Preserve XP ledger.

17. Preserve audit history.

18. Paginate large datasets.

19. Use PostGIS indexes.

20. Use bounding-box map queries.

21. Never store image binary data in PostgreSQL.

22. Optimize images.

23. Maintain storage abstraction.

24. Keep business logic outside UI components.

25. Avoid `any`.

26. Use strict TypeScript.

27. Handle errors explicitly.

28. Do not silence errors.

29. Test new business logic.

30. Run lint.

31. Run typecheck.

32. Run tests.

33. Fix errors before next phase.

34. Do not disable lint rules merely to pass builds.

35. Document important architecture.

36. Do not copy Pokémon intellectual property.

37. ForestQuest must use original terminology, graphics and design.

38. Gamification must never override Forest Department verification.

39. Never encourage unsafe location visits.

40. Protect sensitive environmental coordinates.

---

# 98. FUTURE EXTENSIONS

Architecture may permit future:

```text
QR plantation markers

Tree adoption sponsorship

Donation system

Drone monitoring

Satellite imagery

AI tree health detection

AI species identification

IoT environmental sensors

Weather integration

Carbon estimation

Government SSO

SMS

Open-data API

Public research datasets
```

Do NOT implement these now unless separately requested.

Avoid unnecessary dependencies for hypothetical future features.

---

# 99. PROJECT PRIORITY

Priority order:

```text
1. Data integrity
2. Security
3. Environmental monitoring
4. Verification
5. Usability
6. Offline field operation
7. Performance
8. Community engagement
9. Gamification
```

ForestQuest must enhance environmental monitoring rather than turn the platform into a game that compromises data quality.

---

# 100. FIRST CURSOR INSTRUCTION

Read this entire file before modifying the repository.

Treat this file as the authoritative project specification.

Inspect the existing repository.

If empty, treat it as a new project.

Do NOT implement all phases.

First execute:

PHASE 0

Produce an architecture plan covering:

1. Monorepo
2. Web
3. Mobile
4. API
5. Database
6. PostGIS
7. Authentication
8. RBAC
9. Storage
10. Images
11. Offline synchronization
12. Sri Lankan administrative data
13. ForestQuest event system
14. Security
15. Testing
16. Dependencies
17. Environment configuration
18. Technical risks

Check this specification for technical contradictions.

Resolve them before implementation.

After architecture is coherent, implement:

PHASE 1 ONLY.

Phase 1 must create the development foundation.

Use free/local infrastructure.

Do not require paid services.

If Supabase credentials are unavailable:

* configure `.env.example`
* use local alternatives
* never invent credentials

At completion run:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Fix all relevant errors.

Then stop.

Report:

```text
PHASE 1 COMPLETED

Architecture decisions:
...

Files created:
...

Dependencies installed:
...

Commands executed:
...

Tests:
...

Build status:
...

Warnings:
...

Environment configuration required:
...

Recommended next step:
PHASE 2
```

DO NOT automatically begin Phase 2.

Wait for developer approval.

---

# 101. FINAL PRODUCT PRINCIPLE

The final product must not be:

* A static website
* A UI prototype
* A collection of mock dashboards
* A Pokémon clone
* A simple tree counter

It must become a real cross-platform environmental monitoring ecosystem.

The core concept is:

```text
                    🌱 PLANT
                        │
                        ▼
                    📍 RECORD
                        │
                        ▼
                    📷 MONITOR
                        │
                        ▼
                    ✓ VERIFY
                        │
                        ▼
                    🌳 PROTECT
                        │
                        ▼
                👥 ENGAGE COMMUNITY
                        │
                        ▼
                  🧭 FORESTQUEST
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
        Discover      Learn       Protect
            │           │           │
            └───────────┼───────────┘
                        ▼
                🌍 LONG-TERM IMPACT
```

The system should make tree planting measurable, geographically transparent, continuously monitored, community-supported and environmentally meaningful.
