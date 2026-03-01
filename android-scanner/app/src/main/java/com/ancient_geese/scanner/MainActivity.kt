package com.ancient_geese.scanner

import android.app.PendingIntent
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle
import android.widget.Toast
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.IntentCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.ancient_geese.scanner.ui.theme.ScannerTheme
import io.github.g00fy2.quickie.QRResult
import io.github.g00fy2.quickie.ScanQRCode
import java.net.HttpURLConnection
import java.net.URLEncoder
import java.net.Proxy
import java.net.URL

class MainActivity : ComponentActivity() {
    private var showServerUrlInput by mutableStateOf(false)
    private var serverUrl by mutableStateOf("")
    private var showStartButton by mutableStateOf(false) // Change to your condition

    private var nfcAdapter: NfcAdapter? = null
    private lateinit var pendingIntent: PendingIntent

    private var userId: String? = null
    private var statusMessage by mutableStateOf("Tap card to begin")

    private val scanQrCodeLauncher = registerForActivityResult(ScanQRCode()) { result ->
        when (result) {
            is QRResult.QRSuccess -> {
                serverUrl = result.content.rawValue?.trim().orEmpty()
            }
            else -> Log.d("SCANNER", "ScanQRCode result was not a success")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        nfcAdapter = NfcAdapter.getDefaultAdapter(this)

        // Setup PendingIntent for Foreground Dispatch
        val intent = Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_MUTABLE
        )

        enableEdgeToEdge()
        setContent {
            ScannerTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    androidx.compose.foundation.layout.Column(
                        modifier = Modifier
                            .padding(innerPadding)
                            .fillMaxSize(),
                        verticalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween,
                        horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally
                    ) {
                        androidx.compose.foundation.layout.Spacer(modifier = Modifier.weight(1f))
                        Message(message = statusMessage)
                        if (showStartButton) {
                            androidx.compose.material3.Button(
                                onClick = {
                                    if (serverUrl.isBlank()) {
                                        Toast.makeText(this@MainActivity, "Set a server URL first", Toast.LENGTH_SHORT).show()
                                    } else {
                                        register()
                                    }
                                },
                                modifier = Modifier.padding(top = 8.dp)
                            ) {
                                androidx.compose.material3.Text("Register for game")
                            }
                        }
                        androidx.compose.foundation.layout.Spacer(modifier = Modifier.weight(1f))
                        // Bottom content
                        androidx.compose.foundation.layout.Box(
                            modifier = Modifier
                                .height(64.dp)
                                .padding(bottom = 8.dp),
                            contentAlignment = androidx.compose.ui.Alignment.Center
                        ) {
                            if (showServerUrlInput) {
                                androidx.compose.material3.OutlinedTextField(
                                    value = serverUrl,
                                    onValueChange = { serverUrl = it },
                                    label = { androidx.compose.material3.Text("Server URL") },
                                    singleLine = true,
                                    modifier = Modifier
                                )
                            }
                        }
                        androidx.compose.foundation.layout.Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .navigationBarsPadding()
                                .padding(bottom = 80.dp),
                            horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceEvenly
                        ) {
                            androidx.compose.material3.Button(onClick = { scanQrCodeLauncher.launch(null) }) {
                                androidx.compose.material3.Text("Scan QR Code")
                            }
                            androidx.compose.material3.Button(onClick = { showServerUrlInput = !showServerUrlInput }) {
                                androidx.compose.material3.Text("Edit Server URL")
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        nfcAdapter?.enableForegroundDispatch(this, pendingIntent, null, null)
    }

    override fun onPause() {
        super.onPause()
        nfcAdapter?.disableForegroundDispatch(this)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)

        if (NfcAdapter.ACTION_TAG_DISCOVERED == intent.action) {
            val tag = IntentCompat.getParcelableExtra(intent, NfcAdapter.EXTRA_TAG, Tag::class.java)
            tag?.let {
                lifecycleScope.launch {
                    statusMessage = "Reading tag..."
                    val result = extractUserID(it)
                    userId = result
                    statusMessage = result ?: "Read failed: No data found"
                    showStartButton = result != null
                }
            }
        }
    }

    fun register() {
        lifecycleScope.launch(Dispatchers.IO) {
            if (userId == null) {
                Log.e("SCANNER", "Tried to register with empty id")
                return@launch
            }
            val encodedId = URLEncoder.encode(userId, "UTF-8")
            val requestUrl = serverUrl.trimEnd('/') + "/game/start?id=$encodedId"
            try {
                val connection = URL(requestUrl).openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.connectTimeout = 3000

                val responseCode = connection.responseCode
                connection.disconnect()
                val ok = responseCode in 200..299
                withContext(Dispatchers.Main) {
                    statusMessage = if (ok) "Registered" else "Register failed for ${userId}"
                    showStartButton = !ok
                }
            } catch (e: Exception) {
                Log.e("SCANNER", "Register request error ${requestUrl}", e)
                withContext(Dispatchers.Main) {
                    statusMessage = "Register error"
                }
            }
        }
    }
}

@Composable
fun Message(message: String, modifier: Modifier = Modifier) {
    Text(
        text = message,
        modifier = modifier
            .height(120.dp)
            .padding(8.dp),
        style = androidx.compose.ui.text.TextStyle(fontSize = 28.sp)
    )
}

@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    ScannerTheme {
        Message("Hello Android")
    }
}
