# Building the Android package in Visual Studio

The MAUI project in this guide is called **QadaPrayer** — that is the name the
`x:Class`, the namespace and the file names below assume. The signing file is
**`qada.keystore`**.

Two ways to get a signed `.apk` and `.aab`. Both produce the same thing; pick one.

| | Visual Studio + .NET MAUI | PWABuilder |
| --- | --- | --- |
| Setup | ~7 GB workload | none |
| Where | everything inside VS | website |
| Result | a WebView shell around the live app | a Trusted Web Activity (Play-quality) |
| Updates | **every web deploy updates the app** — no new APK needed | same |
| Signing | `keytool`, one command | the site generates one |
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
3. **Project name:** `QadaPrayer` → **Create**.

   The name matters: MAUI derives the namespace from it, and the two files in
   `android/overrides/` expect `QadaPrayer`. Anything else means editing
   `x:Class` and a `namespace` line (see section 3).

4. Close `MainPage.xaml` if it opened.

Do **not** change `TargetFrameworks` in the `.csproj` — the template picks the
right one for your SDK.

---

## 3. Drop in the two files from this repository

In `android/overrides/` there are two files. **Overwrite** the template's copies
with them (same names, same folder):

| From | To (project folder) |
| --- | --- |
| `MainPage.xaml` | `QadaPrayer/MainPage.xaml` |
| `MainPage.xaml.cs` | `QadaPrayer/MainPage.xaml.cs` |

Then open `QadaPrayer/App.xaml.cs` and replace the line that creates the Shell:

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
`https://souhaieb-marzouk.github.io/QadaPrayer/app/`, with local storage enabled
(the PWA needs it), external links opened in the system browser, and the Android
back button navigating inside the app.

> **If your project has a different name.** The two files declare `QadaPrayer`
> as the namespace (`x:Class="QadaPrayer.MainPage"` and `namespace QadaPrayer;`).
> A project named anything else must change **both** to match, or the build fails
> with *"The name 'InitializeComponent' does not exist"*.

---

## 3b. Finding `keytool`

Modern Visual Studio does not always install the JDK to
`C:\Program Files\Microsoft\jdk-*`. From the **Developer PowerShell**, try in
this order until one works:

```powershell
# 1. fastest — is it already on PATH?
keytool -help

# 2. where does the machine think Java is?
where.exe keytool
Get-Command java, keytool -ErrorAction SilentlyContinue | Select-Object Source

# 3. search the usual install roots (takes a few seconds)
Get-ChildItem "$env:JAVA_HOME\bin\keytool.exe",
              "$env:ANDROID_HOME\jbr\bin\keytool.exe",
              "$env:LOCALAPPDATA\Android\Sdk\jbr\bin\keytool.exe",
              "$env:LOCALAPPDATA\Programs\Android Studio\jbr\bin\keytool.exe",
              "C:\Program Files\Eclipse Adoptium",
              "C:\Program Files\Java",
              "C:\Program Files\Android",
              "${env:ProgramFiles(x86)}\Android" `
  -Recurse -Filter keytool.exe -ErrorAction SilentlyContinue |
  Select-Object -First 5 FullName
```

`keytool` ships with any JDK — including the JetBrains runtime inside Android
Studio (`...\jbr\bin\keytool.exe`), which works perfectly for signing.

If none of that finds it, the JDK is missing and the Android build itself cannot
work: re-run the Visual Studio Installer and tick **OpenJDK** under the MAUI
workload, or install *Eclipse Temurin 17* and re-open the Developer PowerShell.

---

## 4. Set the app identity and version

### Where is `QadaPrayer.csproj`?

It is **not in this repository** — Visual Studio creates it with the project.
In this setup it lives here:

```
C:\Users\Mercenary\Documents\QadaPrayer\QadaPrayer\QadaPrayer.csproj
```

The outer `QadaPrayer` folder holds the solution; the inner one holds the
project. Three ways to reach the file, the first one being the easiest:

1. **Solution Explorer** → right-click the **QadaPrayer** project → **Edit
   Project File**. The XML opens in the editor; no need to find it on disk.
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
<ApplicationTitle>QadaPrayer</ApplicationTitle>
<ApplicationId>com.souhaieb.qadaprayer</ApplicationId>
<ApplicationDisplayVersion>0.2.0</ApplicationDisplayVersion>
<ApplicationVersion>200</ApplicationVersion>
```

`ApplicationTitle` is the label under the icon on the home screen — write `QadaPrayer`
there instead if you prefer the short brand. `ApplicationId` is permanent once
published; pick it now and never change it.

If your file is missing or damaged, `android/QadaPrayer.csproj.example` contains
a complete Android-only project file you can copy over it — the
`TargetFramework` line must match your SDK (`net10.0-android` for .NET 10,
`net9.0-android` for .NET 9).

`ApplicationVersion` is the Android **versionCode**: it must be an integer that
**increases with every release**, otherwise Android refuses the update. Use
`MAJOR*10000 + MINOR*100 + PATCH`:

| Release | ApplicationDisplayVersion | ApplicationVersion |
| --- | --- | --- |
| 0.2.0 | `0.2.0` | `200` |
| 0.2.1 | `0.2.1` | `201` |
| 0.3.0 | `0.3.0` | `300` |

---

## 5. The icon and splash

1. Copy `app/assets/icon-1024.png` to
   `QadaPrayer/Resources/AppIcon/appicon.png`.
2. Replace this line in `QadaPrayer.csproj`:

```xml
<MauiIcon Include="Resources\AppIcon\appicon.svg" ForegroundFile="Resources\AppIcon\appiconfg.svg" Color="#512BD4" />
```

with:

```xml
<MauiIcon Include="Resources\AppIcon\appicon.png" Color="#06100F" />
```

3. Optional: copy `app/assets/favicon.svg` over
   `QadaPrayer/Resources/Splash/splash.svg` and change the splash colour in the
   `<MauiSplashScreen>` line to `#06100F`.

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

## 7. Why "Publish" is greyed out and "Build → Archive" is missing

That is expected, not a mistake on your side.

**Publish → Ad Hoc** and **Build → Archive** belonged to **Xamarin.Android**. The
Archive Manager was **not** carried over to **.NET MAUI**; Microsoft removed it,
and Android publishing now happens through `dotnet publish`. The greyed-out
**Publish…** entry is the Windows/MSIX publisher, which has nothing to do with
Android.

You stay inside Visual Studio: everything below runs in its terminal.

**Tools → Command Line → Developer PowerShell** (this one has `dotnet`, the
Android SDK and the JDK already on `PATH`).

> A plain `dotnet build` also produces an APK, but it is signed with a throwaway
> debug key. Android refuses to update an installed app with a different key, so
> never ship a debug build — use the publish command below with your own
> keystore.

---

## 8. Create the signing keystore (`qada.keystore`)

Visual Studio installs a JDK, which ships `keytool`. Find it as shown in
section 3b, then create the key — **once, ever**. Run it from the folder that
holds `QadaPrayer.csproj`, so the file lands next to the project:

```powershell
cd C:\Users\Mercenary\Documents\QadaPrayer\QadaPrayer

& "C:\path\to\keytool.exe" `
  -genkeypair -v `
  -keystore qada.keystore `
  -alias qada `
  -keyalg RSA -keysize 2048 -validity 10000
```

It asks for:

| Prompt | What to answer |
| --- | --- |
| Enter keystore password | a long password — this is the **store password** |
| Re-enter new password | same again |
| What is your first and last name? | anything, e.g. `QadaPrayer` |
| Organizational unit / organization / city / state / country | anything, e.g. `TN` |
| Enter key password for `<qada>` | press **Enter** to reuse the store password |

You now have `qada.keystore`. **Move it outside the repository** (a folder you
back up) and store its secrets in a password manager:

- file: `qada.keystore`
- store password
- alias: `qada`
- key password (= store password if you pressed Enter)

Losing this file means you can never update the app again under the same
identity. Anyone with the file *and* the password can sign as you. `.gitignore`
already blocks `*.keystore`, but keep it out of the folder anyway.

---

## 9. Publish the APK and the AAB

From the folder that contains `QadaPrayer.csproj`:

```powershell
cd C:\Users\Mercenary\Documents\QadaPrayer\QadaPrayer

dotnet publish -f net10.0-android -c Release `
  -p:AndroidPackageFormats="apk%3Baab" `
  -p:AndroidKeyStore=true `
  -p:AndroidSigningKeyStore="qada.keystore" `
  -p:AndroidSigningKeyAlias=qada `
  -p:AndroidSigningKeyPass="YOUR_KEY_PASSWORD" `
  -p:AndroidSigningStorePass="YOUR_STORE_PASSWORD"
```

> **The semicolon trap.** Writing `-p:AndroidPackageFormats="apk;aab"` fails with
> `MSB1006: Property is not valid. Switch: aab` — MSBuild splits `-p:` on `;` into
> two properties. Use `%3B` (the MSBuild escape for a semicolon) as above, or
> publish twice, once with `=apk` and once with `=aab`.

- `-f` must match `<TargetFramework>` in `QadaPrayer.csproj` — `net10.0-android`
  on the .NET 10 SDK, `net9.0-android` on .NET 9. Read it with:
  ```powershell
  Select-String -Path .\*.csproj -Pattern "TargetFramework"
  ```
- `AndroidPackageFormats=apk` if you only want the APK.
- Passwords containing `&`, `;` or `"` break the argument list. In that case set
  them as environment variables and reference them:
  ```powershell
  $env:QADA_STORE_PASS = 'your store password'
  $env:QADA_KEY_PASS   = 'your key password'
  dotnet publish -f net10.0-android -c Release `
    -p:AndroidPackageFormats="apk%3Baab" `
    -p:AndroidKeyStore=true `
    -p:AndroidSigningKeyStore="qada.keystore" `
    -p:AndroidSigningKeyAlias=qada `
    -p:AndroidSigningKeyPass=env:QADA_KEY_PASS `
    -p:AndroidSigningStorePass=env:QADA_STORE_PASS
  ```

The output lands in:

```
bin\Release\net10.0-android\publish\
```

Look for `*-Signed.apk` and `*.aab`. Copy the APK out and rename it
`qada-<version>.apk` (e.g. `qada-0.2.0.apk`) — that is the file to attach to the
GitHub release, together with `dist/qada-<version>-web.zip` and its `.sha256`.

The private key stays on your machine; only the signed APK travels.

---

## 10. Doing it again for the next release

Two numbers change, one command runs:

1. In `QadaPrayer.csproj`: `ApplicationDisplayVersion` → the new version, and
   `ApplicationVersion` → the next versionCode (200 → 201 → 300 …).
2. Re-run the `dotnet publish` command from section 9.

Same keystore, same alias — that is what lets Android install the new APK over
the old one and keep every logged prayer.

**Speed-up:** put the signing arguments in a file that never gets committed,
`qada.signing.props`:

```xml
<Project>
  <PropertyGroup>
    <AndroidKeyStore>true</AndroidKeyStore>
    <AndroidSigningKeyStore>$(MSBuildThisFileDirectory)qada.keystore</AndroidSigningKeyStore>
    <AndroidSigningKeyAlias>qada</AndroidSigningKeyAlias>
    <AndroidSigningKeyPass>YOUR_KEY_PASSWORD</AndroidSigningKeyPass>
    <AndroidSigningStorePass>YOUR_STORE_PASSWORD</AndroidSigningStorePass>
  </PropertyGroup>
</Project>
```

and reference it from `QadaPrayer.csproj`:

```xml
<Import Project="qada.signing.props" Condition="Exists('qada.signing.props')" />
```

Then `dotnet publish -f net10.0-android -c Release -p:AndroidPackageFormats=apk`
is enough (use `apk%3Baab` for both). Add `qada.signing.props` to `.gitignore` —
it contains the passwords.

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
   `https://souhaieb-marzouk.github.io/QadaPrayer/app/`.
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
| **Publish… is greyed out / no Build → Archive** | Expected for .NET MAUI — the Archive Manager was a Xamarin feature. Use `dotnet publish` (section 9) |
| `MSB1006: Property is not valid. Switch: aab` | The `;` in `-p:AndroidPackageFormats="apk;aab"` split the property. Use `apk%3Baab` (section 9) |
| `NETSDK1045` / "does not target" on publish | `-f` does not match the project's `<TargetFramework>`. .NET 10 SDK → `net10.0-android` |
| `dotnet` is not recognised in the terminal | Use **Tools → Command Line → Developer PowerShell**, not a plain PowerShell window |
| `keytool.exe` not found | Section 3b — it may live in Android Studio's `jbr`, not under `Program Files\Microsoft` |
| "The name 'InitializeComponent' does not exist" | Your project name differs from the namespace in the override files — see section 3 |
| "The project needs a workload" | Visual Studio Installer → Modify → tick **.NET Multi-platform App UI development** |
| Build fails on `MauiIcon` | The `Include` path must match the file name exactly; PNG and SVG both work |
| App installs but data is lost on restart | `DomStorageEnabled` — the override file already sets it; make sure you copied `MainPage.xaml.cs` |
| "App not installed" on the phone | An older build with a different signing key is installed — uninstall it first |
| Update refused | `ApplicationVersion` was not increased |
| Blank white screen | Check the URL in `MainPage.xaml.cs` and that the site is reachable |

---

## 13. Home-screen widget

Optional add-on, not part of the current APK. The web side is already shipped —
the page publishes three strings to a JavaScript bridge — so adding the widget is
five files plus one define in the csproj, then a rebuild.

Full instructions: [`widget/README.md`](widget/README.md).

---

## 14. Updating from inside the app

The web app cannot install anything: only the shell can. The flow is:

1. The shell loads the site with its own version attached:
   `…/app/?apk=0.14.0` (read from `AppInfo.Current.VersionString`).
2. Settings → About → **Check for updates** asks the GitHub API for the latest
   release and compares the two versions. The same check runs quietly once a day
   on launch.
3. When a newer release exists, the button becomes **Download and install**. It
   opens `qadaprayer://install?url=…`, which `MainPage.xaml.cs` intercepts.
4. `ApkInstaller.cs` downloads the APK straight into a `PackageInstaller`
   session and hands it to the system installer. Android shows its own
   confirmation — an app can never replace itself silently.

**Requirements**

- `android.permission.REQUEST_INSTALL_PACKAGES` in
  `Platforms/Android/AndroidManifest.xml` (already in `overrides/AndroidManifest.xml`).
- The GitHub release **must carry the `.apk` asset**, otherwise the check finds a
  version but has nothing to download.
- The first time, Android asks the user to allow installs from this source
  (*Install unknown apps*). That is expected and only happens once.
- Updates are only accepted if signed with the same key, which the system
  enforces.

**If the install does not start:** check `adb logcat -s Qada` — the installer logs
`apk install refused: untrusted url`, `apk install failed: …` or
`apk install: handed to the system installer`.
