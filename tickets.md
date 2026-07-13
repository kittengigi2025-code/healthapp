# Tickets: AI 减脂饮食管理 App MVP

Build an AI-powered calorie tracking mobile app for Southeast Asian users. Users photograph meals, AI identifies food and estimates calories, and provides increasingly personalized advice over time. Source spec: `specs/mvp-spec.md`.

Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain that means top to bottom.

## 1. Project scaffolding & shared types

**What to build:** Initialize the full project skeleton end-to-end — an Expo (React Native + TypeScript) app on the frontend, a Node.js + TypeScript backend service, and Supabase integration (auth, PostgreSQL, storage). Define all core data model types in a shared package or directory so both frontend and backend reference the same TypeScript interfaces. Run the database migration to create the User, UserProfile, MealLog, ExerciseLog, DailySummary, WeeklyPlan, and InteractionHistory tables. At the end of this ticket, `npm run dev` (or equivalent) starts both frontend and backend, and the backend can successfully connect to Supabase.

**Blocked by:** None — can start immediately.

- [x] Expo project initialized with TypeScript template
- [x] Node.js backend project initialized with TypeScript
- [x] Supabase project configured (local dev + cloud project)
- [x] All 7 core data model TypeScript types defined (User, UserProfile, MealLog, ExerciseLog, DailySummary, WeeklyPlan, InteractionHistory)
- [x] Database migration applied — all tables exist in Supabase
- [x] Backend connects to Supabase successfully (health check endpoint passes)
- [x] Frontend and backend share type definitions
- [x] Both projects run locally without errors

## 2. App shell & navigation

**What to build:** Set up the app's navigation structure — a tab bar with 4 tabs (Home, Camera, Plan, Profile) and the onboarding flow as a separate stack. Create placeholder screens for each tab so navigation works end-to-end. At the end of this ticket, a user can launch the app and navigate between all 5 screens via tab bar and onboarding stack.

**Blocked by:** 1. Project scaffolding & shared types.

- [ ] Tab navigator configured with 4 tabs: Home, Camera, Plan, Profile
- [ ] Onboarding stack navigator configured (separate from tabs)
- [ ] Placeholder screens created for all 5 routes
- [ ] Navigation between all tabs works
- [ ] App launches and displays the onboarding flow by default (unauthenticated state)

## 3. Auth & Onboarding

**What to build:** Implement the full signup/login flow using Supabase Auth (email + password). After login, guide new users through a 5-question onboarding (gender, age, height, weight, goal) that saves to the User table. Returning users skip onboarding and go straight to Home. At the end of this ticket, a new user can sign up, complete onboarding, and land on the Home screen; a returning user can log in and go directly to Home.

**Blocked by:** 1. Project scaffolding & shared types, 2. App shell & navigation.

- [ ] Email signup and login screens built
- [ ] Supabase Auth integrated (signup, login, logout)
- [ ] Onboarding flow collects 5 fields: gender, age, height, weight, goal
- [ ] Onboarding data saved to User table in Supabase
- [ ] New users are routed to onboarding; returning users go to Home
- [ ] Auth state persists across app restarts
- [ ] Logout works and returns user to login screen

## 4. Camera & AI meal analysis

**What to build:** The core product loop — user takes a photo (or picks from gallery), the image is uploaded to Supabase Storage, the backend sends it to the LLM via `/api/analyze-meal`, and the app displays identified foods with calories, nutrition breakdown, and AI feedback. User can confirm or edit the results before saving as a MealLog. At the end of this ticket, a user can photograph a meal, see AI-identified food items with calorie estimates, edit if needed, and save the log.

**Blocked by:** 3. Auth & Onboarding.

- [ ] Camera screen with capture and gallery-pick functionality
- [ ] Image upload to Supabase Storage
- [ ] Backend `POST /api/analyze-meal` endpoint — receives image, calls multimodal LLM, returns structured response (food items, calories per item, nutrition breakdown, AI feedback text)
- [ ] LLM prompt engineered for food identification with Southeast Asian food awareness
- [ ] Results display screen showing each identified food item with calories and nutrition
- [ ] User can edit food names and calorie values before saving
- [ ] Confirmed/edited results saved as MealLog record
- [ ] MealLog includes photo_url, identified_foods[], total_calories, nutrition_breakdown, ai_feedback, timestamp
- [ ] LLM response mocked in tests — API contract verified
- [ ] Daily meal analysis limit enforced (max 10 per user per day)

## 5. Daily dashboard

**What to build:** The Home screen becomes a live calorie dashboard. It shows today's total calorie intake (sum of all MealLogs), the user's daily calorie target (calculated from their profile using BMR/TDEE formula), today's calorie gap, a visual progress indicator, and a scrollable list of today's logged meals. At the end of this ticket, after logging a meal, a user sees their updated dashboard with real-time intake tracking.

**Blocked by:** 4. Camera & AI meal analysis.

- [ ] Home screen displays today's total calorie intake (summed from MealLogs)
- [ ] Daily calorie target calculated from user profile (BMR adjusted for goal)
- [ ] Visual progress indicator (gauge or progress bar) showing intake vs target
- [ ] Calorie gap displayed (target - intake)
- [ ] Scrollable list of today's meals with photo thumbnails, food names, and calories
- [ ] Dashboard refreshes automatically when a new meal is logged
- [ ] Empty state shown when no meals logged today
- [ ] Daily calorie calculation logic unit tested

## 6. Exercise logging

**What to build:** From the Plan or Home screen, user can log exercise (select type + enter duration). Backend estimates calories burned using user weight and standard MET values. Exercise appears on the dashboard, and the calorie gap updates to factor in expenditure. At the end of this ticket, a user can log a workout and see their total daily expenditure and updated calorie gap on the dashboard.

**Blocked by:** 5. Daily dashboard.

- [ ] Exercise input form (exercise type dropdown + duration input)
- [ ] Backend `POST /api/log-exercise` endpoint — accepts exercise type + duration, estimates calories burned using user weight and MET values
- [ ] ExerciseLog saved with type, duration_minutes, estimated_calories_burned, timestamp
- [ ] Dashboard shows today's total exercise expenditure
- [ ] Calorie gap updates: gap = target - intake + exercise_burned
- [ ] Today's exercise list displayed on dashboard
- [ ] Common exercise types available (walking, running, cycling, swimming, gym, yoga, etc.)
- [ ] Calorie burn estimation unit tested

## 7. AI daily summary

**What to build:** At end of day (or on-demand via a button on the dashboard), the backend generates an AI summary of the user's day — total intake, expenditure, how well they stayed within target, and personalized suggestions for tomorrow. The summary is saved as DailySummary and displayed on the dashboard. At the end of this ticket, a user can tap "Generate Daily Summary" and receive AI-powered feedback on their day.

**Blocked by:** 6. Exercise logging.

- [ ] "Generate Summary" button on dashboard (or auto-trigger at end of day)
- [ ] Backend `POST /api/generate-daily-summary` endpoint — aggregates today's MealLogs + ExerciseLogs + UserProfile, calls LLM to generate summary + tomorrow's suggestions
- [ ] LLM prompt includes user profile context for personalized summary
- [ ] DailySummary saved with total_intake, total_expenditure, calorie_gap, ai_summary, ai_suggestions
- [ ] Summary and suggestions displayed on dashboard
- [ ] Summary not generated if no meals logged (graceful handling)
- [ ] LLM response mocked in tests

## 8. Weekly fat-loss plan

**What to build:** The Plan screen shows an AI-generated weekly meal and exercise plan. The plan includes daily calorie targets, meal suggestions tailored to the user's preferences and local food context, and simple exercise suggestions. The plan regenerates weekly based on the user's actual performance. At the end of this ticket, a user can view their personalized weekly plan with actionable meal and exercise guidance.

**Blocked by:** 5. Daily dashboard.

- [ ] Plan screen displays current week's plan
- [ ] Backend `POST /api/generate-weekly-plan` endpoint — takes UserProfile + recent DailySummaries + MealLogs, generates 7-day plan via LLM
- [ ] WeeklyPlan includes daily_targets[], meal_suggestions[], exercise_suggestions[], generated_at
- [ ] Meal suggestions reference Southeast Asian food options
- [ ] Plan auto-generates on first visit (if none exists)
- [ ] "Regenerate Plan" button available
- [ ] Plan updates weekly based on actual performance data
- [ ] LLM response mocked in tests

## 9. Profile page

**What to build:** The Profile screen lets users view and edit their full profile (all onboarding fields plus any AI-learned preferences). It also shows a weight trend chart over time. At the end of this ticket, a user can update their weight, change their goal, and see their progress visualized.

**Blocked by:** 3. Auth & Onboarding.

- [ ] Profile screen displays all user fields (gender, age, height, weight, goal, target_weight)
- [ ] All fields are editable
- [ ] Changes saved to User table
- [ ] Weight trend line chart showing historical weight entries
- [ ] User can log new weight entry from profile page
- [ ] AI-learned preferences displayed as tags (from UserProfile, read-only for now)
- [ ] Logout button accessible from profile page

## 10. AI memory system (profile summary)

**What to build:** The "AI gets to know you" feature — a scheduled backend job reads the day's InteractionHistory (MealLogs + ExerciseLogs), calls the LLM to extract insights (dietary preferences, eating patterns, common foods, activity level), and updates the UserProfile. All subsequent AI calls (analyze-meal, daily-summary, weekly-plan) inject the enriched UserProfile into their prompts, making responses increasingly personalized over time. At the end of this ticket, after several days of usage, the AI's advice reflects learned user preferences without the user ever explicitly stating them.

**Blocked by:** 4. Camera & AI meal analysis, 6. Exercise logging.

- [ ] InteractionHistory records created on each meal analysis and exercise log
- [ ] Backend `POST /api/update-profile-summary` endpoint — reads today's InteractionHistory, calls LLM to extract profile insights, merges into UserProfile
- [ ] LLM prompt designed to extract: dietary preferences, allergens, eating patterns, common foods, activity level
- [ ] UserProfile updated with extracted insights (JSON structure, under 500 tokens)
- [ ] All AI endpoints (analyze-meal, daily-summary, weekly-plan) inject current UserProfile into prompts
- [ ] Scheduled trigger for daily summary update (cron job or Supabase scheduled function)
- [ ] UserProfile enrichment verified in tests (mock LLM, check profile update)
- [ ] Token budget enforced: UserProfile ≤ 500 tokens per AI call
