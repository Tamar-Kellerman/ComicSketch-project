using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class SketchesController : ControllerBase
{
    private readonly ComicDbContext _context;
    private readonly AesEncryptionService _aes;

    public SketchesController(ComicDbContext context, AesEncryptionService aes)
    {
        _context = context;
        _aes = aes;
    }

    // POST /api/sketches - שמירת סקיצה חדשה עם הצפנת הסיפור
    [HttpPost]
    public async Task<IActionResult> CreateSketch([FromBody] Sketch newSketch)
    {
        try
        {
            if (newSketch == null) return BadRequest("נתוני סקיצה ריקים");

            if (!string.IsNullOrEmpty(newSketch.OriginalStory))
                newSketch.OriginalStory = _aes.Encrypt(newSketch.OriginalStory);

            _context.Sketches.Add(newSketch);
            await _context.SaveChangesAsync();

            newSketch.OriginalStory = _aes.TryDecrypt(newSketch.OriginalStory);
            return Ok(newSketch);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"שגיאה בשמירת הסקיצה: {ex.Message}");
        }
    }

    // GET /api/sketches?userId=X - כל הסקיצות של סופר עם סטטוס מכרז
    [HttpGet]
    public async Task<IActionResult> GetSketchesByUser([FromQuery] int userId)
    {
        var sketches = await _context.Sketches
            .Where(s => s.UserId == userId)
            .Select(s => new
            {
                s.SketchId,
                s.OriginalStory,
                s.CharactersJson,
                s.ScenesJson,
                Tender = _context.Tenders
                    .Where(t => t.SketchId == s.SketchId && t.UserId == userId)
                    .Select(t => new { t.TenderId, t.Status, t.StartDate, t.EndDate, t.AdditionalDetails })
                    .FirstOrDefault()
            })
            .OrderByDescending(s => s.SketchId)
            .ToListAsync();

        var decrypted = sketches.Select(s => new
        {
            s.SketchId,
            OriginalStory = _aes.TryDecrypt(s.OriginalStory),
            s.CharactersJson,
            s.ScenesJson,
            s.Tender
        });

        return Ok(decrypted);
    }

    // DELETE /api/sketches/{id} - מחיקת סקיצה
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSketch(int id)
    {
        var sketch = await _context.Sketches.FindAsync(id);
        if (sketch == null) return NotFound();
        _context.Sketches.Remove(sketch);
        await _context.SaveChangesAsync();
        return Ok();
    }

    // PATCH /api/sketches/{id}/title - עדכון שם הסקיצה
    [HttpPatch("{id}/title")]
    public async Task<IActionResult> UpdateTitle(int id, [FromBody] string title)
    {
        var sketch = await _context.Sketches.FindAsync(id);
        if (sketch == null) return NotFound();
        sketch.SketchTitle = string.IsNullOrWhiteSpace(title) ? null : title.Trim();
        await _context.SaveChangesAsync();
        return Ok();
    }

    // GET /api/sketches/{id} - שליפת סקיצה לפי ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetSketch(int id)
    {
        try
        {
            var sketch = await _context.Sketches.FindAsync(id);
            if (sketch == null) return NotFound("הסקיצה לא נמצאה");
            sketch.OriginalStory = _aes.TryDecrypt(sketch.OriginalStory);
            return Ok(sketch);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"שגיאה בשליפת הסקיצה: {ex.Message}");
        }
    }
}
