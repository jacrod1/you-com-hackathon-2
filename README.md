# Hand-Roll Rescue

CLI to find crusty, non-CMS small business sites via You.com APIs, score them, and generate outreach drafts.

## Usage
1) cp .env.example .env  # add YOUR key
2) npm i
3) node src/index.js "locksmith" --region "Iowa" --limit 80

Outputs: ./out/prospects.csv, ./out/outreach/*.txt
