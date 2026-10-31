using System.Text.Json;
using Android.App;
using Android.Content;
using Android.OS;
using Android.Util;

namespace QadaPrayer;

/// <summary>
/// Reminder alarms and the notification channel.
///
/// The WebView can compute the schedule but cannot post a notification, so the
/// page sends the next twelve reminders (as base64 JSON in a qadaprayer:// link)
/// and this class turns them into exact alarms.
/// </summary>
[BroadcastReceiver(Enabled = true, Exported = false)]
public class ReminderReceiver : BroadcastReceiver
{
    public override void OnReceive(Context? context, Intent? intent)
    {
        if (context is null || intent is null) return;

        var title = intent.GetStringExtra("title") ?? "QadaPrayer";
        var body = intent.GetStringExtra("body") ?? string.Empty;
        var id = intent.GetIntExtra("id", 0);

        Reminders.Post(context, title, body, id);
    }
}

public static class Reminders
{
    public const string ChannelId = "qada-reminders";
    private const int BaseId = 5200;
    private const int MaxAlarms = 16;

    public class Item
    {
        public long at { get; set; }
        public string title { get; set; } = "QadaPrayer";
        public string body { get; set; } = string.Empty;
    }

    public static void EnsureChannel(Context context)
    {
        if (!OperatingSystem.IsAndroidVersionAtLeast(26)) return;

        var manager = (NotificationManager?)context.GetSystemService(Context.NotificationService);
        if (manager is null) return;

        var channel = new NotificationChannel(ChannelId, "Reminders", NotificationImportance.Default)
        {
            Description = "Prayer and make-up reminders",
        };
        manager.CreateNotificationChannel(channel);
    }

    /// <summary>Ask Android 13+ for the notification permission.</summary>
    public static void RequestPermission(Activity? activity)
    {
        try
        {
            if (!OperatingSystem.IsAndroidVersionAtLeast(33)) return;
            activity?.RequestPermissions(new[] { "android.permission.POST_NOTIFICATIONS" }, 4310);
        }
        catch (Exception error)
        {
            Log.Warn("Qada", "notification permission: " + error.Message);
        }
    }

    public static void CancelAll(Context context)
    {
        var alarms = (AlarmManager?)context.GetSystemService(Context.AlarmService);
        if (alarms is null) return;

        for (var index = 0; index < MaxAlarms; index += 1)
        {
            var pending = Build(context, index, string.Empty, string.Empty);
            alarms.Cancel(pending);
            pending?.Cancel();
        }
    }

    public static void Schedule(Context context, string base64Json)
    {
        try
        {
            EnsureChannel(context);
            CancelAll(context);

            var json = Decode(base64Json);
            var items = JsonSerializer.Deserialize<List<Item>>(json) ?? new List<Item>();
            var alarms = (AlarmManager?)context.GetSystemService(Context.AlarmService);
            if (alarms is null) return;

            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var index = 0;

            foreach (var item in items)
            {
                if (index >= MaxAlarms) break;
                if (item.at <= now + 5000) continue;

                var pending = Build(context, index, item.title ?? "QadaPrayer", item.body ?? string.Empty);
                if (pending is null) continue;

                if (OperatingSystem.IsAndroidVersionAtLeast(31) && !alarms.CanScheduleExactAlarms())
                {
                    alarms.Set(AlarmType.RtcWakeup, item.at, pending);
                }
                else if (OperatingSystem.IsAndroidVersionAtLeast(23))
                {
                    alarms.SetExactAndAllowWhileIdle(AlarmType.RtcWakeup, item.at, pending);
                }
                else
                {
                    alarms.SetExact(AlarmType.RtcWakeup, item.at, pending);
                }

                index += 1;
            }

            Log.Info("Qada", $"reminders scheduled: {index}");
        }
        catch (Exception error)
        {
            Log.Warn("Qada", "reminder scheduling failed: " + error.Message);
        }
    }

    public static void Post(Context context, string title, string body, int id)
    {
        try
        {
            EnsureChannel(context);
            var manager = (NotificationManager?)context.GetSystemService(Context.NotificationService);
            if (manager is null) return;

            var intent = new Intent(context, typeof(MainActivity));
            intent.SetFlags(ActivityFlags.NewTask | ActivityFlags.ClearTop);
            var flags = PendingIntentFlags.UpdateCurrent;
            if (OperatingSystem.IsAndroidVersionAtLeast(23)) flags |= PendingIntentFlags.Immutable;
            var pending = PendingIntent.GetActivity(context, BaseId + id, intent, flags);

            Notification.Builder builder = OperatingSystem.IsAndroidVersionAtLeast(26)
                ? new Notification.Builder(context, ChannelId)
                : new Notification.Builder(context);

            builder
                .SetContentTitle(title)
                .SetContentText(body)
                .SetSmallIcon(Android.Resource.Drawable.StatNotifySync)
                .SetAutoCancel(true)
                .SetContentIntent(pending);

            manager.Notify(BaseId + id, builder.Build());
        }
        catch (Exception error)
        {
            Log.Warn("Qada", "notification failed: " + error.Message);
        }
    }

    private static PendingIntent? Build(Context context, int id, string title, string body)
    {
        var intent = new Intent(context, typeof(ReminderReceiver));
        intent.PutExtra("id", id);
        intent.PutExtra("title", title);
        intent.PutExtra("body", body);

        var flags = PendingIntentFlags.UpdateCurrent;
        if (OperatingSystem.IsAndroidVersionAtLeast(23)) flags |= PendingIntentFlags.Immutable;

        return PendingIntent.GetBroadcast(context, BaseId + id, intent, flags);
    }

    private static string Decode(string base64)
    {
        var bytes = Convert.FromBase64String(base64);
        return System.Text.Encoding.UTF8.GetString(bytes);
    }
}
