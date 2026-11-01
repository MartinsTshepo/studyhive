**StudyHive ⌬**

StudyHive is a free, open-source study resource platform built 
specifically for South African high school students (Grades 8–12).

**Inspired by the frustration of quality study material being locked 
behind expensive paywalls in dollar-based platforms like Scribd **— 
StudyHive gives every SA student free access to notes, study guides, 
and exam resources shared by their peers.

**The Problem**
- Quality study guides and notes are locked behind paywalls
- Dollar-based pricing excludes most South African students
- Students have great material but no easy way to share it
- Past papers are everywhere but good notes are hard to find

**The Solution**
StudyHive is a community-powered platform where:
- Students upload and share their notes and study guides
- Everyone gets free access to all resources
- Material is organized by grade, subject, and resource type
- No account required to browse and read

**Features**
- 📚 Browse by Grade (8–12) and CAPS-aligned subjects
- 🔍 Search across all resources instantly
- 📤 Upload notes, study guides, and exam guidelines
- 📄 Read PDFs directly in the browser
- ⭐ Bookmark resources to your personal library
- 🌙 Light and dark mode
- 📱 Mobile-first design

**Built With**
- React + Vite
- Supabase (database, auth + file storage)
- GitHub Pages (hosting, deployed by GitHub Actions)

**Run it locally**
```bash
npm install
cp .env.example .env     # then fill in your Supabase URL + anon key
npm run dev
```

**Use it like an app on your phone**
On iPhone or iPad, open the site in Safari, tap Share, then Add to Home Screen. On Android, open Chrome's menu and choose Add to Home screen. StudyHive then opens full screen with its own icon.

**Backend setup (Supabase)**
1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql). It creates the tables, Row Level Security policies, and the `study-files` storage bucket.
3. Authentication → URL Configuration: set **Site URL** to your deployed site (e.g. `https://martinstshepo.github.io/studyhive/`) and add it, plus `http://localhost:5173/**`, to **Redirect URLs** so sign-up confirmation emails land in the right place.

**Deploying (GitHub Pages)**
1. Repo → Settings → Pages → Source: **GitHub Actions**.
2. Repo → Settings → Secrets and variables → Actions → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the anon/publishable key, never the service_role key).
3. Push to `master` (or run the workflow manually from the Actions tab). The site publishes to `https://<your-username>.github.io/studyhive/`.

**Contributing**
StudyHive is open source and welcomes contributions from 
developers and students alike. Share your notes, improve 
the code, or spread the word!

**License**
MIT — free forever 
