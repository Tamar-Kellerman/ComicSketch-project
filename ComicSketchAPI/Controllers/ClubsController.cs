using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ComicProject.Controllers // ודאי שה-namespace תואם לפרויקט שלך
{
    [ApiController]
    [Route("api/[controller]")] // זה הופך אוטומטית ל- api/clubs
    public class ClubsController : ControllerBase
    {
        private readonly ComicDbContext _context;

        public ClubsController(ComicDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetClubs()
        {
            try
            {
                var clubs = await _context.Clubs.ToListAsync();
                return Ok(clubs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"שגיאה בשליפת מועדונים: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateClub([FromBody] Club newClub)
        {
            try
            {
                if (newClub == null) return BadRequest("נתוני מסלול ריקים");
                _context.Clubs.Add(newClub);
                await _context.SaveChangesAsync();
                return Ok(newClub);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"שגיאה ביצירת מסלול: {ex.Message}");
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateClub(int id, [FromBody] Club updatedClub)
        {
            var existing = await _context.Clubs.FindAsync(id);
            if (existing == null) return NotFound("המסלול לא נמצא");

            existing.ClubType = updatedClub.ClubType;
            existing.Costs = updatedClub.Costs;
            existing.SketchesPerMonth = updatedClub.SketchesPerMonth;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(existing);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"שגיאה בעדכון מסלול: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteClub(int id)
        {
            var club = await _context.Clubs.FindAsync(id);
            if (club == null) return NotFound("המסלול לא נמצא");

            _context.Clubs.Remove(club);
            try
            {
                await _context.SaveChangesAsync();
                return Ok("המסלול נמחק בהצלחה");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"שגיאה במחיקת מסלול: {ex.Message}");
            }
        }
    }
}