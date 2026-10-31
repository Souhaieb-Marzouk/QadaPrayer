using System.Text.Json;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Dispatching;

// Must match x:Class in MainPage.xaml. The MAUI template names the namespace
// after the project, so this file assumes the project is called "QadaPrayer".
namespace QadaPrayer;

/// <summary>
/// Full-screen host for the QadaPrayer web app.
///
/// The app itself is the live site, so a deploy to GitHub Pages reaches every
/// installed copy on its next launch — the APK only changes when the shell does
/// (icon, name, package id, minimum Android version, URL).
///
/// The home-screen widget gets its data by *pulling*: the page publishes
/// <c>window.QadaWidgetData</c> on every render and this shell reads it with
/// EvaluateJavascript on a timer. That works whether or not Android agreed to
/// inject the JavaScript interface, which is the part that failed on device.
/// </summary>
public partial class MainPage : ContentPage
{
    // Must match the deployed path, including the trailing slash.
    private const string AppUrl = "https://souhaieb-marzouk.github.io/QadaPrayer/app/";
    private const string InstallScheme = "qadaprayer";

    private bool bridgeAttached;
    private bool navigationStarted;
    private IDispatcherTimer? widgetTimer;

    public MainPage()
    {
        InitializeComponent();

        // The JavaScript interface must exist before the first page loads.
        Browser.HandlerChanged += OnBrowserHandlerChanged;
        Browser.Navigated += OnBrowserNavigated;
    }

    protected override void OnAppearing()
    {
        base.OnAppearing();
        AttachBridge();
        StartNavigation();
        StartWidgetSync();
    }

    private void OnBrowserHandlerChanged(object? sender, EventArgs e)
    {
        AttachBridge();
        if (bridgeAttached) StartNavigation();
    }

    private void OnBrowserNavigated(object? sender, WebNavigatedEventArgs e)
    {
        // First pull as soon as the document is ready, then let the timer run.
        _ = PullWidgetDataAsync();
    }

    private void StartNavigation()
    {
        if (navigationStarted) return;
        if (Browser.Handler is null) return;
        navigationStarted = true;
        Browser.Source = new Uri($"{AppUrl}?apk={Uri.EscapeDataString(AppVersion())}");
    }

    /* -------------------------------------------------------------- */
    /* Widget data: push (best effort) + pull (authoritative)          */
    /* -------------------------------------------------------------- */

    private void AttachBridge()
    {
#if ANDROID
        if (bridgeAttached) return;
        if (Browser.Handler?.PlatformView is not Android.Webkit.WebView webView) return;

        EnableWebStorage(webView);

#if DEBUG
        // Lets you inspect the web app from the PC with chrome://inspect.
        Android.Webkit.WebView.SetWebContentsDebuggingEnabled(true);
#endif

        try
        {
            webView.AddJavascriptInterface(
                new QadaNativeBridge(Android.App.Application.Context),
                "QadaNative");
            bridgeAttached = true;
            Android.Util.Log.Info("QadaPrayer", "widget bridge attached");
        }
        catch (Exception error)
        {
            Android.Util.Log.Warn("QadaPrayer", "widget bridge failed: " + error.Message);
        }
#else
        bridgeAttached = true;
#endif
    }

    private void StartWidgetSync()
    {
        if (widgetTimer is not null) return;
        widgetTimer = Dispatcher.CreateTimer();
        widgetTimer.Interval = TimeSpan.FromSeconds(15);
        widgetTimer.Tick += async (_, _) => await PullWidgetDataAsync();
        widgetTimer.Start();
    }

    private async Task PullWidgetDataAsync()
    {
#if ANDROID
        try
        {
            if (Browser.Handler?.PlatformView is not Android.Webkit.WebView webView) return;
            if (string.IsNullOrEmpty(Browser.Source?.ToString())) return;

            webView.EvaluateJavascript(
                "window.QadaWidgetData ? JSON.stringify(window.QadaWidgetData) : ''",
                new JavascriptCallback(this));
        }
        catch (Exception error)
        {
            Android.Util.Log.Warn("QadaPrayer", "widget pull failed: " + error.Message);
        }
#else
        await Task.CompletedTask;
#endif
    }

#if ANDROID
    /// <summary>Receives the JSON string produced by EvaluateJavascript.</summary>
    private void OnWidgetPayload(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw) || raw == "null") return;

        // Android hands back a JSON *string literal* ("{...}") when the script
        // returns a string, so unwrap one level first.
        var payload = raw;
        if (payload.Length >= 2 && payload[0] == '"')
        {
            try
            {
                payload = JsonSerializer.Deserialize<string>(raw) ?? string.Empty;
            }
            catch
            {
                return;
            }
        }

        if (string.IsNullOrWhiteSpace(payload)) return;

        try
        {
            using var document = JsonDocument.Parse(payload);
            var root = document.RootElement;

            var prefs = Android.App.Application.Context.GetSharedPreferences(
                QadaWidgetProvider.PrefsName,
                Android.Content.FileCreationMode.Private);
            if (prefs is null) return;

            using var editor = prefs.Edit();
            if (editor is null) return;

            editor.PutString(QadaWidgetProvider.KeyHeadline, Read(root, "headline"));
            editor.PutString(QadaWidgetProvider.KeyBig, Read(root, "big"));
            editor.PutString(QadaWidgetProvider.KeyNext, Read(root, "next"));
            editor.Apply();

            QadaWidgetProvider.RefreshAll(Android.App.Application.Context);
        }
        catch (Exception error)
        {
            Android.Util.Log.Warn("QadaPrayer", "widget payload rejected: " + error.Message);
        }
    }

    private static string Read(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var value)) return string.Empty;
        return value.ValueKind == JsonValueKind.String
            ? value.GetString() ?? string.Empty
            : value.ToString();
    }

    private sealed class JavascriptCallback : Java.Lang.Object, Android.Webkit.IValueCallback
    {
        private readonly MainPage page;

        public JavascriptCallback(MainPage page)
        {
            this.page = page;
        }

        public void OnReceiveValue(Java.Lang.Object? value)
        {
            page.OnWidgetPayload(value?.ToString());
        }
    }
#endif

    /* -------------------------------------------------------------- */

#if ANDROID
    /// <summary>
    /// The PWA stores everything in localStorage. Android's WebView has DOM
    /// storage off by default in some configurations, and without it the app
    /// would forget every prayer on restart.
    /// </summary>
    private static void EnableWebStorage(Android.Webkit.WebView webView)
    {
        var settings = webView.Settings;
        settings.JavaScriptEnabled = true;
        settings.DomStorageEnabled = true;
        settings.DatabaseEnabled = true;
        settings.SetSupportMultipleWindows(false);
        settings.MediaPlaybackRequiresUserGesture = false;

        // A WebView cannot download on its own: files come as data: URLs.
        webView.SetDownloadListener(new QadaDownloadListener());

        // Paint the native view the same colour as the app: without it Android
        // shows its own background for a frame, which reads as a black flash.
        webView.SetBackgroundColor(Android.Graphics.Color.ParseColor("#06100F"));
    }
#endif


    /// <summary>The installed version name, so the page can compare releases.</summary>
    private static string AppVersion()
    {
        try
        {
            return AppInfo.Current.VersionString;
        }
        catch
        {
            return string.Empty;
        }
    }


    /// <summary>One value out of a qadaprayer:// query string.</summary>
    private static string? QueryValue(Uri uri, string name)
    {
        return (uri.Query ?? string.Empty)
            .TrimStart('?')
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select((part) => part.Split('=', 2))
            .Where((pair) => pair.Length == 2 && pair[0].Equals(name, StringComparison.OrdinalIgnoreCase))
            .Select((pair) => Uri.UnescapeDataString(pair[1]))
            .FirstOrDefault();
    }

    /// <summary>
    /// qadaprayer:// links are how the page asks the shell for native work:
    /// a scheme interception is far more reliable than a JavaScript interface.
    /// </summary>
    private void HandleAppLink(string url)
    {
#if ANDROID
        try
        {
            var uri = new Uri(url);
            if (!uri.Scheme.Equals(InstallScheme, StringComparison.OrdinalIgnoreCase)) return;

            if (uri.Host.Equals("notify-permission", StringComparison.OrdinalIgnoreCase))
            {
                Reminders.RequestPermission(Platform.CurrentActivity);
                return;
            }

            if (uri.Host.Equals("remind-test", StringComparison.OrdinalIgnoreCase))
            {
                var seconds = int.TryParse(QueryValue(uri, "in"), out var parsed) ? parsed : 30;
                Reminders.ScheduleTest(Android.App.Application.Context, seconds);
                return;
            }

            if (uri.Host.Equals("remind", StringComparison.OrdinalIgnoreCase))
            {
                var payload = QueryValue(uri, "data");
                if (!string.IsNullOrWhiteSpace(payload)) Reminders.Schedule(Android.App.Application.Context, payload!);
                return;
            }

            if (!uri.Host.Equals("install", StringComparison.OrdinalIgnoreCase)) return;

            var target = QueryValue(uri, "url");

            if (!ApkInstaller.IsTrusted(target))
            {
                Android.Util.Log.Warn("Qada", "apk install refused: untrusted url");
                return;
            }

            _ = ApkInstaller.InstallAsync(target!);
        }
        catch (Exception error)
        {
            Android.Util.Log.Warn("Qada", "bad app link: " + error.Message);
        }
#endif
    }

    /// <summary>Keep external links in the system browser.</summary>
    private async void OnBrowserNavigating(object? sender, WebNavigatingEventArgs e)
    {
        if (string.IsNullOrEmpty(e.Url))
        {
            return;
        }

        if (e.Url.StartsWith($"{InstallScheme}://", StringComparison.OrdinalIgnoreCase))
        {
            e.Cancel = true;
            HandleAppLink(e.Url);
            return;
        }

        if (e.Url.StartsWith(AppUrl, StringComparison.OrdinalIgnoreCase) ||
            e.Url.StartsWith("about:", StringComparison.OrdinalIgnoreCase) ||
            e.Url.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        e.Cancel = true;

        try
        {
            await Launcher.OpenAsync(e.Url);
        }
        catch
        {
            // A malformed link must never crash the app.
        }
    }

    /// <summary>Android back navigates the web app before leaving it.</summary>
    protected override bool OnBackButtonPressed()
    {
        if (Browser.CanGoBack)
        {
            Browser.GoBack();
            return true;
        }

        return base.OnBackButtonPressed();
    }
}
