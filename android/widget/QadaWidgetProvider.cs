using Android.App;
using Android.Appwidget;
using Android.Content;
using Android.OS;
using Android.Runtime;
using Android.Widget;

namespace QadaPrayer;

/// <summary>
/// Home-screen widget: three strings pushed by the web app.
///
/// The ledger lives in the WebView's localStorage, so nothing native can read
/// it. Instead the page calls the JavaScript bridge (QadaNativeBridge) with an
/// already-formatted snapshot, which is stored in SharedPreferences; this widget
/// only displays it.
/// </summary>
[BroadcastReceiver(Exported = true, Label = "Qada")]
[IntentFilter(new[] { "android.appwidget.action.APPWIDGET_UPDATE" })]
[MetaData("android.appwidget.provider", Resource = "@xml/qada_widget_info")]
public class QadaWidgetProvider : AppWidgetProvider
{
    public const string PrefsName = "qada_widget";
    public const string KeyHeadline = "headline";
    public const string KeyBig = "big";
    public const string KeyNext = "next";

    public override void OnUpdate(Context? context, AppWidgetManager? appWidgetManager, int[]? appWidgetIds)
    {
        if (context is null || appWidgetManager is null || appWidgetIds is null) return;
        foreach (var widgetId in appWidgetIds)
        {
            Render(context, appWidgetManager, widgetId);
        }
    }

    /// <summary>Re-render every placed widget (called when the page pushes data).</summary>
    public static void RefreshAll(Context? context)
    {
        if (context is null) return;

        var manager = AppWidgetManager.GetInstance(context);
        if (manager is null) return;

        var component = new ComponentName(context, Java.Lang.Class.FromType(typeof(QadaWidgetProvider)));
        var ids = manager.GetAppWidgetIds(component);
        if (ids is null) return;

        foreach (var widgetId in ids)
        {
            Render(context, manager, widgetId);
        }
    }

    private static void Render(Context context, AppWidgetManager manager, int widgetId)
    {
        var prefs = context.GetSharedPreferences(PrefsName, FileCreationMode.Private);

        var headline = prefs?.GetString(KeyHeadline, "Qada") ?? "Qada";
        var big = prefs?.GetString(KeyBig, "—") ?? "—";
        var next = prefs?.GetString(KeyNext, string.Empty) ?? string.Empty;

        var views = new RemoteViews(context.PackageName, Resource.Layout.qada_widget);
        views.SetTextViewText(Resource.Id.qada_widget_headline, headline);
        views.SetTextViewText(Resource.Id.qada_widget_big, big);
        views.SetTextViewText(Resource.Id.qada_widget_next, next);

        // Tapping anywhere opens the app.
        var intent = new Intent(context, typeof(MainActivity));
        intent.SetFlags(ActivityFlags.NewTask | ActivityFlags.ClearTop);

        // FLAG_IMMUTABLE only exists from Android 6 (API 23); this app runs on 21+.
        var flags = PendingIntentFlags.UpdateCurrent;
        if (Build.VERSION.SdkInt >= BuildVersionCodes.M)
        {
            flags |= PendingIntentFlags.Immutable;
        }

        var pending = PendingIntent.GetActivity(context, 0, intent, flags);
        views.SetOnClickPendingIntent(Resource.Id.qada_widget_root, pending);

        manager.UpdateAppWidget(widgetId, views);
    }
}
