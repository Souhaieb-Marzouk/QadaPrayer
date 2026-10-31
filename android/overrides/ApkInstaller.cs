using System.Net.Http;
using Android.App;
using Android.Content;
using Android.Util;
using AndroidX.Core.Content;

namespace QadaPrayer;

/// <summary>
/// Downloads an APK with a visible progress notification and hands it to the
/// system installer.
///
/// Android never installs silently: the system shows its own confirmation, and
/// the user may have to allow "install unknown apps" once. That is the point —
/// an app cannot replace itself behind the user's back.
/// </summary>
public static class ApkInstaller
{
    private const string ChannelId = "qada-updates";
    private const int NotificationId = 4100;

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
        var context = Android.App.Application.Context;
        var manager = (NotificationManager?)context.GetSystemService(Context.NotificationService);

        try
        {
            EnsureChannel(context, manager);
            Notify(context, manager, 0, "Downloading the update…");

            var target = new Java.IO.File(context.CacheDir, "qadaprayer-update.apk");
            if (target.Exists()) target.Delete();

            using var http = new HttpClient { Timeout = TimeSpan.FromMinutes(15) };
            using var response = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();

            var total = response.Content.Headers.ContentLength ?? -1;
            long read = 0;
            var lastStep = -10;

            await using (var input = await response.Content.ReadAsStreamAsync())
            await using (var output = System.IO.File.Create(target.AbsolutePath))
            {
                var buffer = new byte[81920];
                int chunk;

                while ((chunk = await input.ReadAsync(buffer)) > 0)
                {
                    await output.WriteAsync(buffer.AsMemory(0, chunk));
                    read += chunk;

                    if (total > 0)
                    {
                        var percent = (int)(read * 100 / total);
                        if (percent >= lastStep + 10)
                        {
                            lastStep = percent;
                            Notify(context, manager, percent, $"Downloading… {percent}%");
                        }
                    }
                }
            }

            Notify(context, manager, 100, "Opening the installer…");
            LaunchInstaller(context, target);
            Log.Info("Qada", "apk install: downloaded, installer opened");
        }
        catch (Exception error)
        {
            Log.Warn("Qada", "apk install failed: " + error.Message);
            manager?.Cancel(NotificationId);
        }
        finally
        {
            running = false;
        }
    }

    private static void LaunchInstaller(Context context, Java.IO.File file)
    {
        var uri = FileProvider.GetUriForFile(context, context.PackageName + ".fileprovider", file);

        var intent = new Intent(Intent.ActionView);
        intent.SetDataAndType(uri, "application/vnd.android.package-archive");
        intent.AddFlags(ActivityFlags.GrantReadUriPermission | ActivityFlags.NewTask);
        context.StartActivity(intent);
    }

    private static void EnsureChannel(Context context, NotificationManager? manager)
    {
        if (!OperatingSystem.IsAndroidVersionAtLeast(26) || manager is null) return;

        var channel = new NotificationChannel(ChannelId, "Updates", NotificationImportance.Low)
        {
            Description = "App updates",
        };
        manager.CreateNotificationChannel(channel);
    }

    private static void Notify(Context context, NotificationManager? manager, int percent, string text)
    {
        if (manager is null) return;

        try
        {
            Notification.Builder builder = OperatingSystem.IsAndroidVersionAtLeast(26)
                ? new Notification.Builder(context, ChannelId)
                : new Notification.Builder(context);

            builder
                .SetContentTitle("QadaPrayer")
                .SetContentText(text)
                .SetSmallIcon(Android.Resource.Drawable.StatSysDownload)
                .SetOngoing(percent < 100)
                .SetProgress(100, Math.Max(0, percent), percent <= 0);

            manager.Notify(NotificationId, builder.Build());
        }
        catch (Exception error)
        {
            Log.Warn("Qada", "update notification failed: " + error.Message);
        }
    }
}
