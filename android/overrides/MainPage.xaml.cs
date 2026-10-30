using Microsoft.Maui.ApplicationModel;

namespace Qada;

/// <summary>
/// Full-screen host for the Qada web app.
///
/// The app itself is the live site, so a deploy to GitHub Pages reaches every
/// installed copy on its next launch — the APK only changes when the shell does
/// (icon, name, package id, minimum Android version, URL).
/// </summary>
public partial class MainPage : ContentPage
{
    // Must match the deployed path, including the trailing slash.
    private const string AppUrl = "https://souhaieb-marzouk.github.io/Qada-App/app/";

    public MainPage()
    {
        InitializeComponent();
        Browser.Source = AppUrl;
    }

    protected override void OnAppearing()
    {
        base.OnAppearing();
        EnableWebStorage();
    }

    /// <summary>
    /// The PWA stores everything in localStorage. Android's WebView has DOM
    /// storage off by default in some configurations, and without it the app
    /// would forget every prayer on restart.
    /// </summary>
    private void EnableWebStorage()
    {
#if ANDROID
        if (Browser.Handler?.PlatformView is Android.Webkit.WebView webView)
        {
            var settings = webView.Settings;
            settings.JavaScriptEnabled = true;
            settings.DomStorageEnabled = true;
            settings.DatabaseEnabled = true;
            settings.SetSupportMultipleWindows(false);
            settings.MediaPlaybackRequiresUserGesture = false;
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
