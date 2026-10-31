using System.Text.Json;
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Dispatching;

// Must match x:Class in MainPage.xaml. The MAUI template names the namespace
// after the project, so this file assumes the project is called "QadaPrayer".
namespace QadaPrayer;

/// <summary>
/// Full-screen host for the Qada web app.
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
    private const string AppUrl = "https://souhaieb-marzouk.github.io/Qada-App/app/";

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
        Browser.Source = new Uri(AppUrl);
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
            Android.Util.Log.Info("Qada", "widget bridge attached");
        }
        catch (Exception error)
        {
            Android.Util.Log.Warn("Qada", "widget bridge failed: " + error.Message);
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
            Android.Util.Log.Warn("Qada", "widget pull failed: " + error.Message);
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
            Android.Util.Log.Warn("Qada", "widget payload rejected: " + error.Message);
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
    }
#endif

    /// <summary>Keep external links in the system browser.</summary>
    private async void OnBrowserNavigating(object? sender, WebNavigatingEventArgs e)
    {
        if (string.IsNullOrEmpty(e.Url))
        {
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
