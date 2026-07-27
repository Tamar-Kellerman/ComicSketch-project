using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class TendersController : ControllerBase
{
    private readonly ComicDbContext _context;

    public TendersController(ComicDbContext context)
    {
        _context = context;
    }

    // GET /api/tenders?status=open|close - כל המכרזים כולל שם הסופר, עם אפשרות סינון
    [HttpGet]
    public async Task<IActionResult> GetAllTenders([FromQuery] string? status = null, [FromQuery] int? userId = null)
    {
        try
        {
            var query = _context.Tenders.Include(t => t.User).AsQueryable();

            if (!string.IsNullOrEmpty(status))
                query = query.Where(t => t.Status == status);

            if (userId.HasValue)
                query = query.Where(t => t.UserId == userId.Value);

            var tenders = await query
                .Select(t => new
                {
                    t.TenderId,
                    t.Status,
                    t.StartDate,
                    t.EndDate,
                    t.AdditionalDetails,
                    WriterName = t.User != null ? t.User.FullName : "לא ידוע",
                    t.SketchId
                })
                .ToListAsync();

            return Ok(tenders);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"שגיאה בשליפת המכרזים: {ex.Message}");
        }
    }

    // PUT /api/tenders/{id} - עדכון פרטי מכרז קיים
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTender(int id, [FromBody] Tender updated)
    {
        try
        {
            var tender = await _context.Tenders.FindAsync(id);
            if (tender == null) return NotFound();

            tender.StartDate = updated.StartDate;
            tender.EndDate = updated.EndDate;
            tender.AdditionalDetails = updated.AdditionalDetails;

            await _context.SaveChangesAsync();
            return Ok(tender);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"שגיאה בעדכון המכרז: {ex.Message}");
        }
    }

    // POST /api/tenders - פרסום מכרז חדש
    [HttpPost]
    public async Task<IActionResult> CreateTender([FromBody] Tender newTender)
    {
        try
        {
            if (newTender == null) return BadRequest("נתוני מכרז ריקים");

            newTender.Status = "open";
            _context.Tenders.Add(newTender);
            await _context.SaveChangesAsync();
            return Ok(newTender);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"שגיאה ביצירת המכרז: {ex.Message}");
        }
    }
}
