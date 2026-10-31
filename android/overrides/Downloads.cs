using Android.Content;
using Android.OS;
using Android.Provider;
using Android.Util;
using Android.Widget;

namespace QadaPrayer;

/// <summary>
/// Saves files the page produces (backup, CSV) into the Downloads folder.
///
/// A WebView has no download manager of its own and cannot read a blob URL, so
/// the page hands the content over as a data: URL with
/// `application/octet-stream;name=&lt;file&gt;` and this listener writes it.
/// </summary>
public class QadaDownloadListener : Java.Lang.Object, Android.Webkit.IDownloadListener
{
    public void OnDownloadStart(
        string? url,
        string? userAgent,
        string? contentDisposition,
        string? mimetype,
        long contentLength)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(url)) return;

            if (!url.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                Log.Warn("Qada", "download ignored (not a data url)");
                return;
            }

            var comma = url.IndexOf(',');
            if (comma < 0) return;

            var header = url.Substring(5, comma - 5);
            var payload = url.Substring(comma + 1);
            var isBase64 = header.Contains("base64", StringComparison.OrdinalIgnoreCase);

            var bytes = isBase64
                ? Convert.FromBase64String(payload)
                : System.Text.Encoding.UTF8.GetBytes(Uri.UnescapeDataString(payload));

            var name = Param(header, "name") ?? NameFor(mimetype ?? header);
            var mime = string.IsNullOrWhiteSpace(mimetype) ? "application/octet-stream" : mimetype!;

            Save(Android.App.Application.Context, Sanitize(name), mime, bytes);
        }
        catch (Exception error)
        {
            Log.Warn("Qada", "download failed: " + error.Message);
            Toast.MakeText(Android.App.Application.Context, "Could not save the file", ToastLength.Long)?.Show();
        }
    }

    /// <summary>Read `name=…` out of the data URL parameters.</summary>
    private static string? Param(string header, string key)
    {
        foreach (var part in header.Split(';'))
        {
            var index = part.IndexOf('=');
            if (index <= 0) continue;
            if (!part.Substring(0, index).Trim().Equals(key, StringComparison.OrdinalIgnoreCase)) continue;
            return Uri.UnescapeDataString(part.Substring(index + 1).Trim());
        }
        return null;
    }

    /// <summary>No slashes, no control characters: this is a file name.</summary>
    private static string Sanitize(string name)
    {
        var clean = new string(name.Where((c) => !char.IsControl(c) && c != '/' && c != '\\').ToArray());
        if (string.IsNullOrWhiteSpace(clean)) clean = "qadaprayer-file";
        return clean.Length > 120 ? clean.Substring(0, 120) : clean;
    }

    private static string NameFor(string mime)
    {
        var stamp = DateTime.Now.ToString("yyyy-MM-dd");
        if (mime.Contains("json", StringComparison.OrdinalIgnoreCase)) return $"qada-backup-{stamp}.json";
        if (mime.Contains("csv", StringComparison.OrdinalIgnoreCase)) return $"qada-ledger-{stamp}.csv";
        return $"qadaprayer-{stamp}.txt";
    }

    private static void Save(Context context, string name, string mime, byte[] bytes)
    {
        if (OperatingSystem.IsAndroidVersionAtLeast(29))
        {
            var values = new ContentValues();
            values.Put(MediaStore.IMediaColumns.DisplayName, name);
            values.Put(MediaStore.IMediaColumns.MimeType, mime);
            values.Put(MediaStore.IMediaColumns.RelativePath, Android.OS.Environment.DirectoryDownloads);

            var resolver = context.ContentResolver;
            var uri = resolver?.Insert(MediaStore.Downloads.ExternalContentUri!, values);
            if (uri is null) throw new InvalidOperationException("media store refused the file");

            using var stream = resolver!.OpenOutputStream(uri);
            if (stream is null) throw new InvalidOperationException("no output stream");

            stream.Write(bytes, 0, bytes.Length);
            stream.Flush();

            Toast.MakeText(context, $"Saved to Downloads: {name}", ToastLength.Long)?.Show();
            Log.Info("Qada", "saved to Downloads: " + name);
            return;
        }

        // Older Android: the app's own folder, no permission needed.
        var directory = context.GetExternalFilesDir(Android.OS.Environment.DirectoryDownloads);
        var path = System.IO.Path.Combine(directory?.AbsolutePath ?? context.FilesDir!.AbsolutePath, name);
        System.IO.File.WriteAllBytes(path, bytes);

        Toast.MakeText(context, $"Saved: {path}", ToastLength.Long)?.Show();
        Log.Info("Qada", "saved: " + path);
    }
}
