using System.Text.Json;
using Android.Content;
using Android.Runtime;
using Android.Webkit;

namespace QadaPrayer;

/// <summary>
/// Exposed to the page as <c>window.QadaNative</c>.
///
/// The web app calls <c>QadaNative.publish(json)</c> with three pre-formatted
/// strings; they are stored for the widget and every placed widget is redrawn.
/// Nothing is read back — the page never depends on the answer.
/// </summary>
public class QadaNativeBridge : Java.Lang.Object
{
    private readonly Context context;

    public QadaNativeBridge(Context context)
    {
        this.context = context;
    }

    [JavascriptInterface]
    [Java.Interop.Export("publish")]
    public void Publish(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return;

        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;

            var prefs = context.GetSharedPreferences(
                QadaWidgetProvider.PrefsName,
                FileCreationMode.Private);
            if (prefs is null) return;

            using var editor = prefs.Edit();
            if (editor is null) return;

            editor.PutString(QadaWidgetProvider.KeyHeadline, Read(root, "headline"));
            editor.PutString(QadaWidgetProvider.KeyBig, Read(root, "big"));
            editor.PutString(QadaWidgetProvider.KeyNext, Read(root, "next"));
            editor.Apply();

            QadaWidgetProvider.RefreshAll(context);
        }
        catch
        {
            // A widget that fails to refresh must never disturb the app.
        }
    }

    private static string Read(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var value)) return string.Empty;
        return value.ValueKind == JsonValueKind.String
            ? value.GetString() ?? string.Empty
            : value.ToString();
    }
}
