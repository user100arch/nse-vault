# NSE Vault 🇰🇪
Personal Nairobi Securities Exchange Portfolio Tracker

## Deploy to Vercel (Free)

### Step 1 — Get an Anthropic API Key
1. Go to https://console.anthropic.com
2. Sign up for a free account
3. Click "API Keys" → "Create Key"
4. Copy the key (starts with sk-ant-...)

### Step 2 — Upload to GitHub
1. Go to https://github.com and create a free account
2. Click the "+" icon → "New repository"
3. Name it "nse-vault", set to Public, click "Create repository"
4. On your computer, open a terminal in this folder and run:
   ```
   git init
   git add .
   git commit -m "NSE Vault initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/nse-vault.git
   git push -u origin main
   ```

### Step 3 — Deploy on Vercel
1. Go to https://vercel.com and sign up with your GitHub account
2. Click "Add New Project"
3. Find and import your "nse-vault" repository
4. Click "Deploy" — Vercel will build it automatically
5. Your app will be live at https://nse-vault.vercel.app (or similar)

### Step 4 — Open the App
1. Visit your Vercel URL
2. On first load, paste your Anthropic API key when prompted
3. The key is saved in your browser — you only enter it once

## Local Development
```
npm install
npm start
```
Opens at http://localhost:3000
