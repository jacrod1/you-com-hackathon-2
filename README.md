# 🕵️‍♂️ Hand-Rolled Website Finder  
**Find outdated, hand-coded small business websites using the You.com Search & Content APIs.**

This project automatically discovers and scores old-school, non-CMS business websites (e.g., local locksmiths, dance studios, landscapers) that might be great candidates for a modern rebuild.  
It uses the **You.com API** to search the open web, retrieve full HTML, analyze site structure, and output a ranked list of "rebuild-ready" prospects — complete with outreach drafts you can send.

---

## 🚀 Features

- 🔍 **Query Generator** — Builds smart search queries targeting niche, static sites (e.g. `"locksmith" "home page" filetype:html"`).  
- 🧠 **Content Fetcher** — Uses the You.com **Search API** and **Contents API** to grab full HTML of each candidate site.  
- 🧾 **Crust Scoring Engine** — Detects old-school code like `<font>` tags, `<table>` layouts, missing SSL, and absent contact info.  
- 📊 **Ranking & Export** — Scores each site's "Rebuild Urgency" and exports to JSON + CSV.  
- ✉️ **Auto Outreach Drafts** — Generates a plain-text message suggesting a rebuild (ready to personalize).  
- 🧰 **CLI-Based Workflow** — Run one command, get results in `/out/`.

---

## 🧩 Example Output
```
Found 12 promising hand-rolled sites.
→ out/prospects.csv, out/prospects.json, out/outreach/*.txt

example-locksmith.com     Crust: 72   CMS: unknown   HTTPS: no
great-dance-studio.net    Crust: 65   CMS: unknown   Missing contact form
```

Each `.txt` in `/out/outreach` contains a ready-to-send email template.

---

## 🛠️ Tech Stack

- **Node.js** (v18+)
- [**You.com API**](https://api.you.com) — `search` + `contents` endpoints  
- **Cheerio** for HTML parsing  
- **csv-stringify** for export  
- **dotenv** for API key management  
- **yargs** for CLI options  

---

## ⚙️ Installation
```bash
git clone https://github.com/jacrod1/you-com-hackathon.git
cd you-com-hackathon
npm install
cp .env.example .env
# Add your YOU_API_KEY inside .env
```

---

## 🧭 Usage

Run a simple search:
```bash
node src/index.js "locksmith" --region "Wisconsin" --limit 20
```

Optional flags:

| Flag | Description | Example |
|------|-------------|---------|
| `--region` | Adds a location term to queries | `--region "Iowa"` |
| `--limit` | Max number of candidate sites | `--limit 100` |
| `--debug` | Prints all dropped sites + reasons | `--debug` |

Results are written to `/out/`:

- `prospects.json` — detailed data
- `prospects.csv` — quick view / import
- `/out/outreach/*.txt` — email drafts

---

## 🧠 How It Works

1. **Discovery** — Builds multiple search queries per niche to find old HTML pages.
2. **Fetch** — Retrieves HTML via You.com Contents API.
3. **Analyze** —
   - Checks for CMS fingerprints (WordPress, Wix, etc.)
   - Detects `<font>`, `<center>`, `<table>` layouts
   - Flags missing viewport, meta, SSL
   - Tests for missing or weak "Contact" links
4. **Score** — Combines all signals into a 0–100 "Rebuild Urgency" score.
5. **Export** — Outputs data + outreach templates to `/out/`.

---

## 🧑‍💻 Development Notes

### Debugging in VS Code

Use this `launch.json` configuration:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug you-com-hackathon",
  "skipFiles": ["<node_internals>/**"],
  "program": "${workspaceFolder}/src/index.js",
  "args": ["locksmith", "--region", "Wisconsin", "--limit", "10", "--debug"],
  "envFile": "${workspaceFolder}/.env",
  "console": "integratedTerminal"
}
```

### Common Issues

| Error | Cause | Fix |
|-------|-------|-----|
| `body used already` | Tried to read Response twice | Clone before reading or only parse once |
| `illegal return statement` | Return outside a function | Ensure return inside `youSearch()` |
| `writeCSV is not defined` | Helper missing | Add `writeCSV()` from README instructions |

---

## 📦 Folder Structure
```
src/
 ├─ index.js          # Main CLI script
 ├─ you.js            # You.com API wrappers
 ├─ detectors.js      # CMS, contact, and legacy tag detectors
 ├─ score.js          # Scoring logic
 ├─ util.js           # Helper functions (domain parsing, cheerio load)
 └─ ...
out/
 ├─ prospects.csv
 ├─ prospects.json
 └─ outreach/
     ├─ example-site.com.txt
```

---

## 🔑 Environment Variables

| Key | Description |
|-----|-------------|
| `YOU_API_KEY` | Your You.com API key |

You can get one from https://api.you.com.

---

## 🧩 Example Outreach Message
```
Subject: Quick modern refresh for example-locksmith.com

Hi there — I came across your site example-locksmith.com.  
It looks like it's not mobile-friendly and doesn't have a clear contact button.  
I build ultra-fast, mobile-friendly sites for local locksmiths — with tap-to-call, maps, and contact forms.  
Would you like a free live preview before deciding?

– Jake
```

---

## 🧠 Future Enhancements

- 🔁 Schedule automatic re-scans (detect when policies or pages change)
- 🤖 Integrate GPT for smarter outreach personalization
- 🌐 Front-end dashboard for browsing scored leads
- 📬 CRM integration (HubSpot / Airtable / Sheets)
- 🧮 Machine learning-based scoring model

---

## 🏁 License

MIT License © 2025 Jake Roder

Made for the You.com Hackathon.  
_"Find the worst sites on the internet — and make them beautiful again."_