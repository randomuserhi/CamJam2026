package com.ancient_geese.scanner

import android.nfc.Tag
import android.nfc.tech.MifareClassic
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

fun ByteArray.toAsciiString(): String {
    return this.takeWhile { it != 0.toByte() } // terminate at null
        .map { it.toInt().toChar() }
        .joinToString("")
        .trim()
}

private const val SECTOR = 2;

suspend fun extractUserID(tag: Tag): String? = withContext(Dispatchers.IO) {
    val mfc = MifareClassic.get(tag) ?: return@withContext "Not a Mifare Classic card"

    val keyBytes = try {
        BuildConfig.SCANNER_NFC_KEY.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
    } catch (e: Exception) {
        return@withContext "Invalid Key Format"
    }

    try {
        mfc.connect()

        val success = mfc.authenticateSectorWithKeyA(SECTOR, keyBytes)

        if (success) {
            val firstBlock = mfc.sectorToBlock(SECTOR)
			var blockData = mfc.readBlock(firstBlock)
			blockData.toAsciiString()
        } else {
            "SCANNER: Authentication Failed"
        }
    } catch (e: Exception) {
        "Error: ${e.message}"
    } finally {
        mfc.close()
    }
}
