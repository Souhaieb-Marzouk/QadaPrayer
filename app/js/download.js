/**
 * Saving a file.
 *
 * A browser downloads through a blob and an anchor. A WebView cannot: it has no
 * download manager entry and the blob URL is unreachable from the native side.
 * There, the file is handed over as a `data:` URL, which the shell answers
 * through its own download listener and writes to the Downloads folder.
 */

/** True when the page is running inside the Android shell (it adds ?apk=). */
export function inShell() {
  try {
    return new URLSearchParams(window.location.search).has('apk');
  } catch {
    return false;
  }
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * @param {{name: string, mime: string, text: string}} file
 * @returns {'shell'|'browser'}
 */
export function saveFile({ name, mime, text }) {
  if (inShell()) {
    // data: URLs are what the shell's DownloadListener understands.
    window.location.href = `data:${mime};base64,${toBase64(text)}`;
    return 'shell';
  }

  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'browser';
}

/** Notify the shell so it can show "saved in Downloads" where that applies. */
export function announceSaved() {
  try {
    window.location.href = 'qadaprayer://saved';
  } catch {
    /* ignore */
  }
}
