package com.dz.pressing;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.dz.pressing.bridges.AndroidSMSBridge;
import com.dz.pressing.plugins.DirectSmsPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register DirectSmsPlugin for Capacitor
        registerPlugin(DirectSmsPlugin.class);
        super.onCreate(savedInstanceState);

        // Also inject AndroidSMSBridge into the WebView for direct fallback
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                webView.addJavascriptInterface(new AndroidSMSBridge(this), "AndroidSMSBridge");
            }
        } catch (Exception e) {
            // ignore
        }
    }
}
