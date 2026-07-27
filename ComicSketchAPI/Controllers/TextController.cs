using Microsoft.AspNetCore.Mvc;
using System;
using System.Net.Http;
using System.Net.Http.Json; // <--- מאפשר שימוש ב-ReadFromJsonAsync בצורה נוחה
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using ComicSketchAPI.Models; // <-- ייבוא המודלים מהתיקייה החדשה

namespace ComicSketchAPI.Controllers // <-- ה-namespace הנכון של הקונטרולרים שלך
{
    [ApiController]
    [Route("api/[controller]")]
    public class TextController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public TextController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpPost("process")]
        public async Task<IActionResult> ProcessText([FromBody] TextRequest request)
        {
            if (string.IsNullOrEmpty(request?.Text))
            {
                return BadRequest("הטקסט לא יכול להיות ריק");
            }

            // 1. יצירת הלקוח מתוך ה-Factory
            var client = _httpClientFactory.CreateClient();
            
            // התיקון הראשון: הגדרת Timeout של 10 דקות כדי לתת ל-AI זמן לעבוד
            client.Timeout = TimeSpan.FromMinutes(10);

            string pythonUrl = "http://localhost:5000/process"; 

            // הכנת הנתונים לשליחה לפייתון (נשלח בצורת { text: "הסיפור שלך" })
            var jsonPayload = JsonSerializer.Serialize(new { text = request.Text });
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            try
            {
                // שליחת הבקשה לשרת הפייתון
                var response = await client.PostAsync(pythonUrl, content);

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode((int)response.StatusCode, "שגיאה בתקשורת עם שרת העיבוד בפייתון");
                }

                // התיקון השני והקריטי: 
                // אנחנו קוראים את התוצאה כאובייקט דינמי/גמיש (object) במקום לנסות להפוך אותה למחרוזת פשוטה.
                // זה מונע את שגיאת ה-JsonException ומעביר את המערך של הדמויות לתוך ה-React בצורה מושלמת.
                var result = await response.Content.ReadFromJsonAsync<object>();

                return Ok(result);
            }
            catch (TaskCanceledException)
            {
                // מקרה קצה שבו עברו יותר מ-10 דקות (לא אמור לקרות, אבל ליתר ביטחון)
                return StatusCode(504, "בקשת ה-AI התבטלה עקב חריגה מזמן ההמתנה (Timeout)");
            }
            catch (Exception ex)
            {
                // תפיסת שגיאות כלליות אחרות
                return StatusCode(500, $"שגיאה פנימית בעיבוד הנתונים: {ex.Message}");
            }
        }
    }
}