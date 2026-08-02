package com.liankhay.capture;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleSendIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleSendIntent(intent);
    }

    private void handleSendIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();

        if ((Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action)) && type != null) {
            Uri uri = null;
            if (intent.hasExtra(Intent.EXTRA_STREAM)) {
                try {
                    uri = (Uri) intent.getParcelableExtra(Intent.EXTRA_STREAM);
                } catch (Exception e) {
                    Log.e("LiankhayCapture", "Error getting EXTRA_STREAM", e);
                }
            }
            if (uri == null && intent.getClipData() != null && intent.getClipData().getItemCount() > 0) {
                uri = intent.getClipData().getItemAt(0).getUri();
            }
            if (uri != null) {
                processAndSaveSharedFile(uri);
            }
        }
    }

    private void processAndSaveSharedFile(Uri uri) {
        try {
            Log.d("LiankhayCapture", "Processing shared content URI: " + uri.toString());
            InputStream inputStream = getContentResolver().openInputStream(uri);
            if (inputStream != null) {
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                byte[] data = new byte[16384];
                int nRead;
                while ((nRead = inputStream.read(data, 0, data.length)) != -1) {
                    buffer.write(data, 0, nRead);
                }
                buffer.flush();
                byte[] bytes = buffer.toByteArray();
                inputStream.close();

                String base64Content = Base64.encodeToString(bytes, Base64.NO_WRAP);
                String fileName = getFileNameFromUri(uri);

                final String jsToRun = String.format(
                    "try { " +
                    "  var payload = { fileName: '%s', base64: '%s' }; " +
                    "  localStorage.setItem('capacitor_shared_data', JSON.stringify(payload)); " +
                    "  window.__CAPACITOR_SHARED_DATA__ = payload; " +
                    "  window.dispatchEvent(new CustomEvent('capacitor_share_received', { detail: payload })); " +
                    "} catch(e) { console.error('Error saving shared data in JS:', e); }",
                    escapeJsString(fileName),
                    base64Content
                );

                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().post(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                bridge.getWebView().evaluateJavascript(jsToRun, null);
                            } catch (Exception e) {
                                Log.e("LiankhayCapture", "Error evaluating JS in WebView", e);
                            }
                        }
                    });
                }
            }
        } catch (Exception e) {
            Log.e("LiankhayCapture", "Error reading shared content URI", e);
        }
    }

    private String getFileNameFromUri(Uri uri) {
        String fileName = "Shared_Excel_File.xlsx";
        try {
            android.database.Cursor cursor = getContentResolver().query(uri, null, null, null, null);
            if (cursor != null) {
                int nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                if (nameIndex != -1 && cursor.moveToFirst()) {
                    fileName = cursor.getString(nameIndex);
                }
                cursor.close();
            }
        } catch (Exception e) {
            Log.e("LiankhayCapture", "Error getting file name", e);
        }
        return fileName;
    }

    private String escapeJsString(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}

