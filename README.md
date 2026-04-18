# Program Builder

Rule-based fitness program builder for coaches. Built on Dr. John Rusin's methodology.

## Stack

| Layer | Tech | Cost |
|---|---|---|
| Frontend | React + Vite → GitHub Pages | Free |
| Exercise DB | `exercises.json` (277 entries) | Free |
| Client data | Google Sheets + Apps Script | Free |
| AI features | Anthropic API (pay per use) | ~$0.01–0.05/session |

---

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173/program-builder/

---

## Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `program-builder`)
2. Push this folder to `main`
3. In repo Settings → Pages → Source: **GitHub Actions**
4. The workflow deploys automatically on every push to `main`

Your app will be live at `https://YOUR_USERNAME.github.io/program-builder/`

> If your repo name is different, update `base` in `vite.config.js`

---

## Google Apps Script setup

1. Open [script.google.com](https://script.google.com) → New project
2. Paste the contents of `apps-script/Code.gs`
3. Set `SHEET_ID` to your spreadsheet ID (from the URL)
4. Set `INTAKE_SHEET_NAME` to your form responses tab name
   - Default: `Form Responses 1`
5. Check `COL` indices match your form column order (0-indexed)
6. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Copy the `/exec` URL
8. In the app → Settings (⚙) → paste the URL

### Column mapping

Open your Sheets file and count the columns (0-indexed):

| Column | Field | Default index |
|---|---|---|
| Timestamp | `timestamp` | 0 |
| Name | `name` | 1 |
| Age | `age` | 2 |
| Sex | `sex` | 3 |
| Primary goals | `goals` | 4 |
| Specific outcome | `specific_goals` | 5 |
| Training experience | `experience` | 6 |
| Training style | `training_history` | 7 |
| Injuries / medical | `injuries` | 8 |
| Sessions per week | `sessions_per_week` | 9 |
| Session duration | `session_duration` | 10 |
| Preferred times | `schedule_preference` | 11 |
| Equipment access | `equipment_available` | 12 |
| Equipment preference | `equipment_preferred` | 13 |
| Likes / dislikes | `likes_dislikes` | 14 |
| Daily activity | `activity_level` | 15 |
| Sleep quality | `sleep` | 16 |
| Stress level | `stress` | 17 |
| Success metrics | `success_metrics` | 18 |
| Biggest concern | `concerns` | 19 |
| Anything else | `additional_notes` | 20 |
| Fitness level | `fitness_level` | 21 |

If your form column order differs, edit the `COL` object in `Code.gs`.

---

## Anthropic API key

- Settings (⚙) → paste your key (`sk-ant-…`)
- Stored in `localStorage` only — never sent anywhere except `api.anthropic.com`
- Used for: AI coaching cues (✦ button), quality check, auto-tagging new exercises

---

## Adding exercises to the database

Open `src/data/exercises.json` and add entries following this schema:

```json
{
  "name": "My Exercise",
  "patterns": ["squat"],
  "phases": ["kpi", "accessory"],
  "intensity": ["moderate"],
  "equipment": ["dumbbell"],
  "skill_level": ["beginner"],
  "spine_load": "low",
  "joint_stress": ["knee_friendly"],
  "contraindications": [],
  "goals": ["hypertrophy"],
  "tags": ["quads", "glutes"],
  "unilateral": false,
  "regression": [],
  "progression": []
}
```

Only use values from the master taxonomy (see `src/logic/filter.js` for allowed values).

Or use the AI auto-tagger: the ✦ button in Settings → Add exercise will call the API and return a pre-filled JSON entry for you to review.

---

## File structure

```
program-builder/
├── src/
│   ├── App.jsx                  # Main app
│   ├── App.css                  # All styles
│   ├── data/
│   │   └── exercises.json       # 277-exercise database
│   ├── logic/
│   │   ├── filter.js            # Deterministic filter engine
│   │   ├── split.js             # Training split generator
│   │   └── progression.js       # 4-week wave loading
│   ├── components/
│   │   ├── ClientPanel.jsx      # Left panel
│   │   ├── DayBlock.jsx         # Training day
│   │   ├── PhaseSection.jsx     # Phase block (collapsible)
│   │   ├── ExerciseRow.jsx      # Exercise row + dropdown
│   │   ├── SessionNoteModal.jsx # Floating note button
│   │   ├── SettingsModal.jsx    # Settings
│   │   └── ExportButton.jsx     # DOCX export
│   └── hooks/
│       ├── useSheets.js         # Google Apps Script calls
│       └── useAI.js             # Anthropic API calls
├── apps-script/
│   └── Code.gs                  # Paste into Google Apps Script
├── .github/
│   └── workflows/
│       └── deploy.yml           # Auto-deploy to GitHub Pages
├── vite.config.js
├── package.json
└── README.md
```
