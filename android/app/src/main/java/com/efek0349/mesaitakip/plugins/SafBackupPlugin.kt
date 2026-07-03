package com.efek0349.mesaitakip.plugins

import android.content.Intent
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter

/**
 * SafBackupPlugin
 *
 * Sorun: FilePicker.pickDirectory() Android'de content://.../tree/...
 * şeklinde bir SAF (Storage Access Framework) "tree" URI'si döndürüyor.
 * Capacitor'ın @capacitor/filesystem eklentisi bu URI'lere YAZAMAZ — resmi
 * dokümantasyon bile content:// URI'leri sadece OKUMA için desteklediğini
 * söylüyor. Eski kod `folderPath + "/" + dosyaAdı` şeklinde düz string
 * birleştirmesi yapıyordu; bu geçerli bir SAF alt-belge URI'si üretmiyor,
 * bu yüzden yazma her zaman başarısız oluyordu (klasör silinmiş/taşınmış
 * olsun ya da olmasın).
 *
 * Bu eklenti, Android'in SAF içinde yeni belge oluşturmak için native
 * olarak sağladığı tek doğru yolu kullanır: DocumentFile.fromTreeUri(...) +
 * DocumentFile.createFile(...) + ContentResolver üzerinden yazma/okuma.
 */
@CapacitorPlugin(name = "SafBackup")
class SafBackupPlugin : Plugin() {

    private fun dirFromTreeUri(treeUri: String): DocumentFile? {
        return try {
            DocumentFile.fromTreeUri(context, Uri.parse(treeUri))
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Klasör seçildiğinde bir kez çağrılır. Uygulama kapanıp açılsa,
     * telefon yeniden başlasa bile SAF izninin kalıcı olmasını sağlar.
     * (FilePicker.pickDirectory() bunu zaten yapıyor olabilir ama tekrar
     * çağırmak zararsızdır — emin olmak için burada da yapıyoruz.)
     */
    @PluginMethod
    fun persistPermission(call: PluginCall) {
        val treeUri = call.getString("treeUri")
        if (treeUri == null) {
            call.reject("treeUri gerekli")
            return
        }
        try {
            val uri = Uri.parse(treeUri)
            val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            context.contentResolver.takePersistableUriPermission(uri, flags)
            call.resolve()
        } catch (e: Exception) {
            // Bazı cihazlarda/URI türlerinde izin zaten kalıcıdır ve bu
            // çağrı hata verebilir; bu durumda sessizce geç, kritik değil.
            call.resolve()
        }
    }

    @PluginMethod
    fun writeFile(call: PluginCall) {
        val treeUri = call.getString("treeUri")
        val fileName = call.getString("fileName")
        val data = call.getString("data")
        val mimeType = call.getString("mimeType") ?: "application/json"

        if (treeUri == null || fileName == null || data == null) {
            call.reject("treeUri, fileName ve data gerekli")
            return
        }

        try {
            val dir = dirFromTreeUri(treeUri)
            if (dir == null || !dir.exists() || !dir.isDirectory) {
                call.reject("FOLDER_UNAVAILABLE")
                return
            }

            // Aynı isimde dosya varsa üzerine yazmak için önce sil (createFile
            // aynı isimde ikinci bir dosya oluşturursa "adı (1).json" gibi bir
            // isim üretebilir, biz tam olarak istediğimiz ada yazmak istiyoruz).
            dir.findFile(fileName)?.delete()

            val newFile = dir.createFile(mimeType, fileName)
                ?: run { call.reject("Dosya oluşturulamadı."); return }

            val out = context.contentResolver.openOutputStream(newFile.uri)
                ?: run { call.reject("Dosyaya yazma akışı açılamadı."); return }

            out.use { stream ->
                OutputStreamWriter(stream, Charsets.UTF_8).use { writer -> writer.write(data) }
            }

            val ret = JSObject()
            ret.put("uri", newFile.uri.toString())
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Yedeklenirken hata oluştu: ${e.message}", e)
        }
    }

    @PluginMethod
    fun listFiles(call: PluginCall) {
        val treeUri = call.getString("treeUri")
        if (treeUri == null) {
            call.reject("treeUri gerekli")
            return
        }
        try {
            val dir = dirFromTreeUri(treeUri)
            if (dir == null || !dir.exists() || !dir.isDirectory) {
                call.reject("FOLDER_UNAVAILABLE")
                return
            }

            val files = JSArray()
            for (child in dir.listFiles()) {
                if (child.isFile) {
                    val item = JSObject()
                    item.put("name", child.name)
                    item.put("lastModified", child.lastModified())
                    item.put("size", child.length())
                    files.put(item)
                }
            }

            val ret = JSObject()
            ret.put("files", files)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Klasör listelenemedi: ${e.message}", e)
        }
    }

    @PluginMethod
    fun readFile(call: PluginCall) {
        val treeUri = call.getString("treeUri")
        val fileName = call.getString("fileName")
        if (treeUri == null || fileName == null) {
            call.reject("treeUri ve fileName gerekli")
            return
        }
        try {
            val dir = dirFromTreeUri(treeUri)
            val target = dir?.findFile(fileName)
            if (target == null || !target.exists()) {
                call.reject("Dosya bulunamadı.")
                return
            }
            val inputStream = context.contentResolver.openInputStream(target.uri)
                ?: run { call.reject("Dosya okunamadı."); return }

            val text = inputStream.use {
                BufferedReader(InputStreamReader(it, Charsets.UTF_8)).readText()
            }

            val ret = JSObject()
            ret.put("data", text)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Dosya okunurken hata oluştu: ${e.message}", e)
        }
    }

    @PluginMethod
    fun deleteFile(call: PluginCall) {
        val treeUri = call.getString("treeUri")
        val fileName = call.getString("fileName")
        if (treeUri == null || fileName == null) {
            call.reject("treeUri ve fileName gerekli")
            return
        }
        try {
            val dir = dirFromTreeUri(treeUri)
            val target = dir?.findFile(fileName)
            val ok = target?.delete() ?: false
            val ret = JSObject()
            ret.put("success", ok)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Dosya silinirken hata oluştu: ${e.message}", e)
        }
    }
}
