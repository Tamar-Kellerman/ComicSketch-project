using System.Security.Cryptography;
using System.Text;

/// <summary>
/// שירות הצפנה ופענוח נתונים באמצעות אלגוריתם AES-256.
/// משמש להגנה על מידע רגיש המאוחסן במסד הנתונים (כגון תעודת זהות וסיפורים מקוריים).
/// </summary>
public class AesEncryptionService
{
    // מפתח ההצפנה בגודל 32 בתים (256 ביט) — נטען מ-appsettings.json
    private readonly byte[] _key;

    /// <summary>
    /// טוען את מפתח ה-AES מהקונפיגורציה.
    /// המפתח חייב להיות מקודד Base64 ובגודל 32 בתים בדיוק.
    /// </summary>
    public AesEncryptionService(IConfiguration configuration)
    {
        var keyBase64 = configuration["Encryption:AesKey"]
            ?? throw new InvalidOperationException("AES key not configured");
        _key = Convert.FromBase64String(keyBase64);
    }

    /// <summary>
    /// מצפין טקסט רגיל ומחזיר מחרוזת Base64 המכילה IV + נתון מוצפן.
    /// בכל קריאה נוצר IV אקראי חדש — כך שאותו קלט יניב פלט שונה בכל פעם,
    /// מה שמונע זיהוי ערכים זהים במסד הנתונים.
    /// </summary>
    /// <param name="plainText">הטקסט לצורך הצפנה</param>
    /// <returns>מחרוזת Base64 בפורמט: [IV (16 בתים)] + [נתון מוצפן]</returns>
    public string Encrypt(string plainText)
    {
        using var aes = Aes.Create();
        aes.Key = _key;
        aes.GenerateIV(); // IV אקראי של 16 בתים — ייחודי לכל הצפנה

        using var encryptor = aes.CreateEncryptor();
        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var cipher = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);

        // שילוב ה-IV עם הנתון המוצפן לקובץ בינארי אחד לשמירה
        var combined = new byte[aes.IV.Length + cipher.Length];
        Array.Copy(aes.IV, 0, combined, 0, aes.IV.Length);
        Array.Copy(cipher, 0, combined, aes.IV.Length, cipher.Length);

        return Convert.ToBase64String(combined);
    }

    /// <summary>
    /// מפענח מחרוזת Base64 שהוצפנה באמצעות Encrypt.
    /// שולף את ה-IV מ-16 הבתים הראשונים ומשתמש בו לפענוח שאר הנתון.
    /// </summary>
    /// <param name="cipherText">מחרוזת Base64 כפי שהוחזרה מ-Encrypt</param>
    /// <returns>הטקסט המקורי לפני ההצפנה</returns>
    public string Decrypt(string cipherText)
    {
        var combined = Convert.FromBase64String(cipherText);

        using var aes = Aes.Create();
        aes.Key = _key;

        // חילוץ ה-IV מ-16 הבתים הראשונים
        var iv = new byte[16];
        Array.Copy(combined, 0, iv, 0, 16);
        aes.IV = iv;

        // שאר הבתים הם הנתון המוצפן
        using var decryptor = aes.CreateDecryptor();
        var cipherBytes = new byte[combined.Length - 16];
        Array.Copy(combined, 16, cipherBytes, 0, cipherBytes.Length);

        var plain = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
        return Encoding.UTF8.GetString(plain);
    }

    /// <summary>
    /// מנסה לפענח ערך — אם הפענוח נכשל (למשל ערך ישן שאינו מוצפן), מחזיר את הערך כמות שהוא.
    /// משמש בעת קריאת נתונים שייתכן שלא כולם עברו הצפנה.
    /// </summary>
    /// <param name="value">הערך לפענוח</param>
    /// <returns>הטקסט המפוענח, או הטקסט המקורי אם הפענוח נכשל</returns>
    public string TryDecrypt(string value)
    {
        if (string.IsNullOrEmpty(value)) return value;
        try { return Decrypt(value); }
        catch { return value; }
    }
}
