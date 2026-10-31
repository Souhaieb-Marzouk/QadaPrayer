using System.Net.Http;
using Android.App;
using Android.Content;
using Android.Content.PM;
using Android.Util;
using Android.Widget;

namespace QadaPrayer;

/// <summary>
/// Downloads an APK and hands it to the system installer.
///
/// Android never installs silently: the system shows its own confirmation, and
/// the user may have to allow "install unknown apps" once. That is the whole
/// point — an app cannot replace itself behind the user's back.
/// </summary>
[BroadcastReceiver(Exported = false)]
public class ApkInstallReceiver : BroadcastReceiver
{
    public override void OnReceive(Context? context, Intent? intent)
    {
        if (intent is null) return;

        var status = intent.GetIntExtra(PackageInstaller.ExtraStatus, (int)PackageInstallStatus.Failure);
        if (status == (int)PackageInstallStatus.Success)
        {
            Log.Info("Qada", "apk install: success");
            return;
        }

        var message = intent.GetStringExtra(PackageInstaller.ExtraStatusMessage) ?? string.Empty;
        Log.Warn("Qada", $"apk install: failed ({status}) {message}");

        if (context is not null && !string.IsNullOrWhiteSpace(message))
        {
            Toast.MakeText(context, message, ToastLength.Long)?.Show();
        }
    }
}

public static class ApkInstaller
{
    private static bool running;

    /// <summary>Only ever downloads from GitHub — the URL comes from their API.</summary>
    public static bool IsTrusted(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return false;
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
        if (uri.Scheme != Uri.UriSchemeHttps) return false;

        return uri.Host.Equals("github.com", StringComparison.OrdinalIgnoreCase)
            || uri.Host.EndsWith(".github.com", StringComparison.OrdinalIgnoreCase)
            || uri.Host.EndsWith("githubusercontent.com", StringComparison.OrdinalIgnoreCase);
    }

    public static async Task InstallAsync(string url)
    {
        if (running)
        {
            Log.Warn("Qada", "apk install: already running");
            return;
        }

        running = true;

        try
        {
            var context = Android.App.Application.Context;
            var installer = context.PackageManager?.PackageInstaller;
            if (installer is null) throw new InvalidOperationException("no package installer");

            var parameters = new PackageInstaller.SessionParams(PackageInstallMode.FullInstall);
            parameters.SetAppPackageName(context.PackageName);
            var sessionId = installer.CreateSession(parameters);

            var session = installer.OpenSession(sessionId);
            if (session is null) throw new InvalidOperationException("no session");

            using var http = new HttpClient { Timeout = TimeSpan.FromMinutes(10) };
            using var download = await http.GetStreamAsync(url);
            using (var target = session.OpenWrite("base.apk", 0, -1))
            {
                await download.CopyToAsync(target);
                session.Fsync(target);
            }

            var intent = new Intent(context, typeof(ApkInstallReceiver));
            var flags = PendingIntentFlags.UpdateCurrent;
            if (OperatingSystem.IsAndroidVersionAtLeast(23))
            {
                flags |= PendingIntentFlags.Immutable;
            }

            var pending = PendingIntent.GetBroadcast(context, sessionId, intent, flags);
            session.Commit(pending?.IntentSender!);
            session.Close();

            Log.Info("Qada", "apk install: handed to the system installer");
        }
        catch (Exception error)
        {
            Log.Warn("Qada", "apk install failed: " + error.Message);
        }
        finally
        {
            running = false;
        }
    }
}
