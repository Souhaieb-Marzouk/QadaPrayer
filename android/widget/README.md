# Android home-screen widget

A small widget showing what is left, how today is going, and the next prayer.

The app is a WebView, so the widget cannot read the ledger itself — the page
pushes three already-formatted strings (in the app's language) through a
JavaScript bridge, and the widget just displays them. If the app has never run,
the widget shows `QadaPrayer` and a dash.

> **Status:** the web side is shipped and tested. The native side below has
> **not been compiled** — it needs the MAUI build on your machine. If
> `dotnet publish` complains, send the error and we fix it.

---

## 1. Copy these files

Into the `QadaPrayer` project:

| From | To |
| --- | --- |
| `widget/QadaWidgetProvider.cs` | `QadaPrayer/Platforms/Android/QadaWidgetProvider.cs` |
| `widget/QadaNativeBridge.cs` | `QadaPrayer/Platforms/Android/QadaNativeBridge.cs` |
| `widget/Resources/layout/qada_widget.xml` | `QadaPrayer/Platforms/Android/Resources/layout/qada_widget.xml` |
| `widget/Resources/xml/qada_widget_info.xml` | `QadaPrayer/Platforms/Android/Resources/xml/qada_widget_info.xml` |
| `widget/Resources/drawable/qada_widget_bg.xml` | `QadaPrayer/Platforms/Android/Resources/drawable/qada_widget_bg.xml` |

The `Resources/…` folders may not exist yet — create them; MAUI picks them up
automatically.

## 2. Nothing to enable

The widget is wired in `MainPage.xaml.cs`, which already creates the JavaScript
bridge before the page loads. If you replaced that file with an older copy, copy
`android/overrides/MainPage.xaml.cs` over it — the bridge must be attached
*before* the first navigation, or the page never sees it.

## 3. Rebuild

```powershell
cd C:\Users\Mercenary\Documents\QadaPrayer\QadaPrayer
dotnet publish -f net10.0-android -c Release `
  -p:AndroidPackageFormats=apk `
  -p:AndroidKeyStore=true `
  -p:AndroidSigningKeyStore="qada.keystore" `
  -p:AndroidSigningKeyAlias=qada `
  -p:AndroidSigningKeyPass=env:QADA_KEY_PASS `
  -p:AndroidSigningStorePass=env:QADA_STORE_PASS
```

Install the APK, open the app once (so it can push its first snapshot), then
long-press the home screen → **Widgets** → **QadaPrayer**.

## 4. How it behaves

- The widget shows `Today 3/5`, the number of make-ups left, and
  `Next Asr · 15:02`.
- It refreshes whenever the app renders (at most once every few seconds) and
  every 30 minutes on its own.
- Tapping it opens the app.
- If the app is never opened, the values stay at whatever they were last time —
  a widget cannot compute the ledger on its own.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `QadaNativeBridge could not be found` | The two `.cs` files are not in `Platforms/Android/`, or `QADA_WIDGET` is defined without them |
| `qada_widget_info` not found | The `Resources/xml/` folder is missing or the file is not named exactly that |
| Widget shows `QadaPrayer` and `—` | The app has not run yet since the widget was added — open it once |
| Widget in the list but empty | `AddJavascriptInterface` failed; check the `try/catch` in `MainPage.xaml.cs` was kept |
