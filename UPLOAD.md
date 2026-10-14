# Publishing this repository on GitHub

## Option 1: web interface, no Git

1. Sign in at github.com, click **+ → New repository** (top right).
2. Name: `prism-cards`, description: "iOS widget inspired Lovelace cards for Home Assistant".
   Public, **do not** tick "Add a README" — this bundle brings its own.
3. Click **uploading an existing file**.
4. Drag the files of this folder in — keep the structure, so `dist/prism-cards.js`
   stays inside `dist/`.
5. **Commit changes**.

## Option 2: with Git

```bash
cd prism-cards-repo
git init
git add .
git commit -m "Prism Cards v51"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/prism-cards.git
git push -u origin main
```

## Then: tag a release

HACS works with releases. After the first upload:

1. In the repository: **Releases → Create a new release**.
2. Tag `v51`, title `v51`, a short summary of what's in it.
3. **Publish release**.

For every new version: replace `dist/prism-cards.js`, bump the version in
`README.md` and in `PRISM_VERSION` at the top of the file, publish a new release.

## Add it to HACS

HACS → three-dot menu → **Custom repositories** →
`https://github.com/YOUR-NAME/prism-cards`, category **Lovelace**.

## Before you publish

- **Screenshots.** A dashboard screenshot at the top of the README makes the
  biggest difference. Put images in `images/` and embed them with
  `![Dashboard](images/dashboard.png)`.
- **Your name** in `LICENSE` — it currently says `<YOUR NAME>`.
- A private repository works with HACS only through a personal access token.
  Public is simpler.
