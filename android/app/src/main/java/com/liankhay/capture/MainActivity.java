package com.liankhay.capture;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "LiankhayCapture";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

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

    private void handleSendIntent(final Intent intent) {
        if (intent == null) return;

        executor.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    String action = intent.getAction();
                    String type = intent.getType();

                    if (action != null && (Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action))) {
                        Uri uri = null;

                        if (intent.hasExtra(Intent.EXTRA_STREAM)) {
                            try {
                                Object extra = intent.getExtras().get(Intent.EXTRA_STREAM);
                                if (extra instanceof Uri) {
                                    uri = (Uri) extra;
                                }
                            } catch (Throwable t) {
                                Log.e(TAG, "Error reading EXTRA_STREAM", t);
                            }
                        }

                        if (uri == null && intent.getClipData() != null && intent.getClipData().getItemCount() > 0) {
                            try {
                                uri = intent.getClipData().getItemAt(0).getUri();
                            } catch (Throwable t) {
                                Log.e(TAG, "Error reading ClipData URI", t);
                            }
                        }

                        if (uri != null) {
                            saveSharedFileToCache(uri);
                        }
                    }
                } catch (Throwable t) {
                    Log.e(TAG, "Error in handleSendIntent", t);
                }
            }
        });
    }

    private void saveSharedFileToCache(Uri uri) {
        try {
            Log.d(TAG, "Processing shared content URI: " + uri.toString());
            InputStream inputStream = getContentResolver().openInputStream(uri);
            if (inputStream == null) return;

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

            JSONObject jsonPayload = new JSONObject();
            jsonPayload.put("fileName", fileName);
            jsonPayload.put("base64", base64Content);
            jsonPayload.put("timestamp", System.currentTimeMillis());

            File cacheFile = new File(getCacheDir(), "shared_sheet_data.json");
            FileOutputStream fos = new FileOutputStream(cacheFile);
            fos.write(jsonPayload.toString().getBytes(StandardCharsets.UTF_8));
            fos.flush();
            fos.close();

            Log.d(TAG, "Successfully wrote shared file JSON to cache: " + cacheFile.getAbsolutePath());

            // Notify WebView using a lightweight JS event
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (bridge != null && bridge.getWebView() != null) {
                            bridge.getWebView().evaluateJavascript(
                                "(function(){ window.dispatchEvent(new CustomEvent('capacitor_share_received')); })();",
                                null
                            );
                        }
                    } catch (Throwable t) {
                        Log.e(TAG, "Error dispatching JS event", t);
                    }
                }
            });

        } catch (Throwable t) {
            Log.e(TAG, "Error saving shared file to cache", t);
        }
    }

    private String getFileNameFromUri(Uri uri) {
        String fileName = "Shared_Excel_File.xlsx";
        try {
            Cursor cursor = getContentResolver().query(uri, null, null, null, null);
            if (cursor != null) {
                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (nameIndex != -1 && cursor.moveToFirst()) {
                    fileName = cursor.getString(nameIndex);
                }
                cursor.close();
            }
        } catch (Throwable t) {
            Log.e(TAG, "Error getting file name from URI", t);
        }
        return fileName;
    }
}


