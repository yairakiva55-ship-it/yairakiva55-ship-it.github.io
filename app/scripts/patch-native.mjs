// Adds the app's sign-in return link (com.winnerwinnerchickendinner.poker://) to the Android and iOS projects.
// Safe to run many times. Run after `npx cap add android|ios`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEME = "com.winnerwinnerchickendinner.poker";

const manifest = path.join(APP, "android/app/src/main/AndroidManifest.xml");
if (fs.existsSync(manifest)) {
  let xml = fs.readFileSync(manifest, "utf8");
  if (!xml.includes(`android:scheme="${SCHEME}"`)) {
    const filter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${SCHEME}" android:host="auth-callback" />
            </intent-filter>
`;
    xml = xml.replace(/(<activity[\s\S]*?android:name="\.MainActivity"[\s\S]*?>)/, `$1${filter}`);
    fs.writeFileSync(manifest, xml);
    console.log("android: added sign-in link");
  }
}

const plist = path.join(APP, "ios/App/App/Info.plist");
if (fs.existsSync(plist)) {
  let x = fs.readFileSync(plist, "utf8");
  if (!x.includes(`<string>${SCHEME}</string>`)) {
    const entry = `\t<key>CFBundleURLTypes</key>
\t<array>
\t\t<dict>
\t\t\t<key>CFBundleURLName</key>
\t\t\t<string>${SCHEME}</string>
\t\t\t<key>CFBundleURLSchemes</key>
\t\t\t<array>
\t\t\t\t<string>${SCHEME}</string>
\t\t\t</array>
\t\t</dict>
\t</array>
`;
    x = x.replace(/<dict>\n/, `<dict>\n${entry}`);
    // App only uses HTTPS (standard encryption) — no export compliance questions on every upload.
    if (!x.includes("ITSAppUsesNonExemptEncryption")) x = x.replace(/<dict>\n/, `<dict>\n\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n`);
    fs.writeFileSync(plist, x);
    console.log("ios: added sign-in link");
  }
}
