# ShopHaat — Deployment Guide

## GitHub-এ আপলোড করুন
1. GitHub-এ একটি নতুন repository তৈরি করুন
2. এই zip ফাইলটি unzip করুন
3. সব ফাইল GitHub repository-তে আপলোড করুন

## Vercel-এ Deploy করুন
1. https://vercel.com-এ যান
2. "Add New Project" → GitHub repository select করুন
3. Framework: Next.js (auto-detected)
4. Environment Variables set করুন:
   ```
   DATABASE_URL="file:./dev.db"  (বা আপনার production database URL)
   NEXTAUTH_SECRET="আপনার-secret-key"
   NEXTAUTH_URL="https://your-app.vercel.app"
   NEXT_PUBLIC_SITE_URL="https://your-app.vercel.app"
   ```
5. Build Command: `npx prisma generate && npx prisma db push && next build`
   (বা package.json এর build script ব্যবহার করুন)
6. Deploy ক্লিক করুন

## Database (Vercel Postgres বা external)
- Vercel-এ SQLite কাজ করবে না (serverless filesystem)
- তাই Prisma Postgres বা MySQL ব্যবহার করুন
- `prisma/schema.prisma` এ datasource provider পরিবর্তন করুন

## Demo Logins
- Admin: admin@shophaat.com / admin123
- Customer: customer@shophaat.com / customer123

## Seed Data
প্রথমবার deploy করার পর seed চালান:
```
npx tsx scripts/seed.ts
```
