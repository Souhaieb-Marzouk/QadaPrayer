# Building the Android package in Visual Studio

Two ways to get a signed `.apk` and `.aab`. Both produce the same thing; pick one.

| | Visual Studio + .NET MAUI | PWABuilder |
| --- | --- | --- |
| Setup | ~7 GB workload | none |
| Where | everything inside VS | website |
| Result | a WebView shell around the live app | a Trusted Web Activity (Play-quality) |
| Updates | **every web deploy updates the app** — no new APK needed | same |
| Signing | VS creates the keystore for you | site generates one |
| Best for | you already live in VS | first release, or a Play Store submission |

> This guide covers the Visual Studio route. If you only want an APK once, the
> PWABuilder route at the bottom takes three minutes.

---

## 1. Install the MAUI workload

1. Open **Visual Studio Installer**.
2. Next to *Visual Studio Professional 2026* → **Modify**.
3. In **Workloads** tick **.NET Multi-platform App UI development**.
4. In the right-hand panel make sure these are ticked:
   - **Android SDK** (API 34 or newer)
   - **Android Emulator** (optional, only if you want to test without a phone)
   - **OpenJDK** (Microsoft's build of JDK 17)
5. **Modify** → wait (~7 GB).

Verify: **Tools → Android → Android SDK Manager** opens and shows an installed
platform. If it does, you are done with setup.

---

## 2. Create the project

1. **File → New → Project**.
2. Search **.NET MAUI App** → choose the C# one → **Next**.
3. **Project name:** `Qada` → **Create**.
4. Close `MainPage.xaml` if it opened, and delete `MainPage.xaml` **and**
   `MainPage.xaml.cs` from the project (right-click → Delete).

Do **not** change `TargetFrameworks` in the `.csproj` — the template picks the
right one for your SDK.

---

## 3. Drop in the two files from this repository

In `android/overrides/` there are two files. **Overwrite** the template's copies
with them (same names, same folder):

| From | To (project root) |
| --- | --- |
| `MainPage.xaml` | `Qada/MainPage.xaml` |
| `MainPage.xaml.cs` | `Qada/MainPage.xaml.cs` |

Then open `Qada/App.xaml.cs` and replace the line that creates the Shell:

```csharp
// before
protected override Window CreateWindow(IActivationState? activationState)
    => new Window(new AppShell());

// after
protected override Window CreateWindow(IActivationState? activationState)
    => new Window(new MainPage());
```

That removes the Shell (and its title bar) so the web app fills the screen. If
you skip it, the `Shell.NavBarIsVisible="False"` already set in `MainPage.xaml`
covers the same thing.

What the files do: a full-screen WebView pointed at
`https://souhaieb-marzouk.github.io/Qada-App/app/`, with local storage enabled
(the PWA needs it), external links opened in the system browser, and the Android
back button navigating inside the app.

---

## 4. Set the app identity and version

### Where is `Qada.csproj`?

It is **not in this repository** — Visual Studio creates it with the project.
You will find it inside the project folder you just created, usually:

```
C:\Users\<you>\source\repos\Qada\Qada\Qada.csproj
```

Three ways to reach it, the first one being the easiest:

1. **Solution Explorer** → right-click the **Qada** project → **Edit Project
   File**. The XML opens in the editor; no need to find it on disk.
2. Right-click the project → **Open Folder in File Explorer** → the `.csproj` is
   the only file with that extension.
3. In **Solution Explorer**, the project node itself *is* the `.csproj` —
   double-clicking it opens the file.

If there is no `.csproj` anywhere, the MAUI project was never created: the
**`.NET MAUI App`** template only appears once the *Multi-platform App UI
development* workload is installed (section 1).

### The lines to change

Inside the first `<PropertyGroup>`, set these:

```xml
<ApplicationTitle>Qada</ApplicationTitle>
<ApplicationId>com.souhaieb.qada</ApplicationId>
<ApplicationDisplayVersion>0.2.0</ApplicationDisplayVersion>
<ApplicationVersion>200</ApplicationVersion>
```

If your file is missing or damaged, `android/Qada.csproj.example` contains a
complete Android-only project file you can copy over it — but check the
`TargetFramework` line first (`net9.0-android` vs `net10.0-android`).

```xml
<ApplicationTitle>Qada</ApplicationTitle>
<ApplicationId>com.souhaieb.qada</ApplicationId>
<ApplicationDisplayVersion>0.2.0</ApplicationDisplayVersion>
<ApplicationVersion>200</ApplicationVersion>
```

`ApplicationVersion` is the Android **versionCode**: it must be an integer that
**increases with every release**, otherwise Android refuses the update. Use
`MAJOR*10000 + MINOR*100 + PATCH`:

| Release | ApplicationDisplayVersion | ApplicationVersion |
| --- | --- | --- |
| 0.2.0 | `0.2.0` | `200` |
| 0.2.1 | `0.2.1` | `201` |
| 0.3.0 | `0.3.0` | `300` |

> `ApplicationId` is permanent once published. If you ever plan to put this on
> the Play Store, pick it now and never change it. `com.souhaieb.qada` is fine.

---

## 5. The icon and splash

1. Copy `app/assets/icon-1024.png` to `Qada/Resources/AppIcon/appicon.png`.
2. Replace this line in `Qada.csproj`:

```xml
<MauiIcon Include="Resources\AppIcon\appicon.svg" ForegroundFile="Resources\AppIcon\appiconfg.svg" Color="#512BD4" />
```

with:

```xml
<MauiIcon Include="Resources\AppIcon\appicon.png" Color="#06100F" />
```

3. Optional: copy `app/assets/favicon.svg` over `Qada/Resources/Splash/splash.svg`
   and change the splash colour in the `<MauiSplashScreen>` line to `#06100F`.

---

## 6. Run it on your phone first

1. On the phone: **Settings → About → tap Build number 7 times** (enables
   Developer options), then **Developer options → USB debugging**.
2. Plug it in, accept the "Allow USB debugging?" prompt.
3. In VS's toolbar, pick your device in the run dropdown → press **F5** (Debug).

If the app opens on a black screen or an empty WebView, check the **Output →
Debug** window; the usual cause is a missing `INTERNET` permission (it is added
by default) or no network on the phone.

---

## 7. Create the signing keystore

This is the part that matters for the rest of the app's life.

1. In **Solution Explorer**, right-click the **Qada** project → **Publish…**
   (or **Build → Archive…** in older layouts). The **Archive Manager** opens.
2. Click **Distribute…** → **Ad Hoc**.
3. Choose **Create new signing identity** (or "Create a new keystore"):
   - **Alias:** `qada`
   - **Password:** a long password you will keep
   - **Validity:** `10000` days (Android ignores anything past 2033, but be generous)
   - **Full name / Organisation:** anything, it is only metadata
4. VS generates the keystore and signs the APK with it.

The keystore lands in:

```
%USERPROFILE%\AppData\Local\Xamarin\Mono for Android\Keystore\qada\qada.keystore
```

**Copy it somewhere safe — outside the repository.** Losing it means you can
never update the app again under the same identity; anyone with the file and the
password can sign as you. Never commit it.

Suggested storage: a password manager entry plus an encrypted backup, and note
the pair (alias `qada`, its password, the store password).

---

## 8. Produce the APK

In the Archive Manager, select the archive → **Open Folder**. Inside you get:

```
Qada.apk                     ← install this; this is what goes on the release
com.souhaieb.qada-Signed.apk ← signed variant (same app)
```

Rename it `qada-<version>.apk` (e.g. `qada-0.2.0.apk`) so the download link in
`index.html` and the README stay valid, and attach it to the GitHub release
together with `dist/qada-<version>-web.zip` and its `.sha256`.

---

## 9. Produce the AAB (only for the Play Store)

Same archive → **Distribute…** → **Google Play** → choose the **same** signing
identity → it produces `Qada.aab`, signed and ready to upload.

You do not need an AAB for GitHub releases. People cannot install an `.aab`
directly — it is a bundle that Google splits into APKs.

---

## 10. Doing it from the command line instead

Once the workload is installed, the whole thing is two commands:

```powershell
# one keystore, generated once
keytool -genkeypair -v -keystore qada.keystore -alias qada `
        -keyalg RSA -keysize 2048 -validity 10000

# apk + aab, signed
dotnet publish -f net10.0-android -c Release `
  -p:AndroidPackageFormats="apk;aab" `
  -p:AndroidKeyStore=true `
  -p:AndroidSigningKeyStore=qada.keystore `
  -p:AndroidSigningKeyAlias=qada `
  -p:AndroidSigningKeyPass=YOUR_KEY_PASSWORD `
  -p:AndroidSigningStorePass=YOUR_STORE_PASSWORD
```

Change `net10.0-android` to whatever `TargetFrameworks` says in your `.csproj`.
The output is in `bin\Release\net10.0-android\publish\`.

---

## 11. Why you will rarely need to rebuild this APK

The wrapper loads the **live** website. When you push a new version of the app
to GitHub Pages, the installed APK shows it on the next launch — the PWA updates
itself, exactly like in a browser. The APK only needs rebuilding when you change
the shell itself: the icon, the app name, the package id, the minimum Android
version, or the URL.

That also means the reminder and calendar features you build later reach Android
users without touching the store.

---

## 12. Offline behaviour

The first launch downloads the app and the service worker caches it, so later
launches work without a connection. Two things to know:

- If the phone has never opened the app online, there is nothing cached.
- If you later want a **guaranteed-offline** build (the app bundled inside the
  APK, no network ever), that needs the assets inside `Resources/Raw` and a
  custom asset loader. Ask and I will add that variant.

---

## PWABuilder (the three-minute alternative)

1. Make sure the site is live at
   `https://souhaieb-marzouk.github.io/Qada-App/app/`.
2. Go to <https://www.pwabuilder.com/>, paste that URL, **Start**.
3. **Package for stores → Android** → **Download**.
4. The zip contains `*.apk`, `*.aab`, `assetlinks.json` and
   `signing.keystore` + `signing-key-info.txt`.

Keep `signing.keystore` and the passwords printed in `signing-key-info.txt` — it
is the same "never lose it" rule. It also gives you `assetlinks.json`, which
removes the browser address bar when the app opens (a TWA nicety a plain WebView
does not need).

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "The project needs a workload" | Visual Studio Installer → Modify → tick **.NET Multi-platform App UI development** |
| Build fails on `MauiIcon` | The `Include` path must match the file name exactly; PNG and SVG both work |
| App installs but data is lost on restart | `DomStorageEnabled` — the override file already sets it; make sure you copied `MainPage.xaml.cs` |
| "App not installed" on the phone | An older build with a different signing key is installed — uninstall it first |
| Update refused | `ApplicationVersion` was not increased |
| Blank white screen | Check the URL in `MainPage.xaml.cs` and that the site is reachable |
