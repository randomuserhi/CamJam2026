package com.ancient_geese.scanner

import android.app.PendingIntent
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle
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
import androidx.core.content.IntentCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import com.ancient_geese.scanner.ui.theme.ScannerTheme
import io.github.g00fy2.quickie.QRResult
import io.github.g00fy2.quickie.ScanQRCode

class MainActivity : ComponentActivity() {
    private var showServerUrlInput by mutableStateOf(false)
    private var serverUrl by mutableStateOf("")

    private var nfcAdapter: NfcAdapter? = null
    private lateinit var pendingIntent: PendingIntent


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
                        Message(message = nfcDisplayMessage)
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

        nfcDisplayMessage = "Detected tag..."

        val action = intent.action

        if (NfcAdapter.ACTION_TAG_DISCOVERED == intent.action) {
            val tag = IntentCompat.getParcelableExtra(intent, NfcAdapter.EXTRA_TAG, Tag::class.java)
            tag?.let {
                lifecycleScope.launch {
                    nfcDisplayMessage = "Reading..."
                    val result = extractUserID(it)
                    nfcDisplayMessage = result ?: "Read failed: No data found"
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
    )
}

@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    ScannerTheme {
        Message("Hello Android")
    }
}
