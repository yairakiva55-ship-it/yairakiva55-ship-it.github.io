# Winner Poker — האפליקציה

האפליקציה בנויה **מאותו קוד של האתר** (`../index.html`, `../rooms.js` וכו') ומחוברת **לאותו Supabase** — אותם חשבונות, משחקים ושולחנות באתר ובאפליקציה.

## אנדרואיד — נבנה לבד בענן
כל עדכון לאתר בונה אוטומטית אפליקציית אנדרואיד ב-GitHub:
**Actions → Android app → הריצה האחרונה → Artifacts** — שם יש `app-debug.apk` (להתקנה בטלפון לבדיקה) ו-`app-release.aab` (לחנות, אחרי הגדרת חתימה).

## אייפון — על ה-Mac
צריך Xcode ו-Node.js 20. בתיקייה הזו:
```
npm install
npm run icons
npm run ios
```
Xcode ייפתח — בוחרים Team (חשבון Apple Developer) ולוחצים ▶︎.

## חשוב
- כתובת החזרה להתחברות: `com.winnerwinnerchickendinner.poker://auth-callback` — חייבת להיות ב-Supabase → Authentication → URL Configuration → Redirect URLs.
- `npm run build` מעתיק את קבצי האתר ל-`www/` ומוסיף את `native.js` (רטט, שיתוף, כפתור חזור, התחברות דרך דפדפן המכשיר).
