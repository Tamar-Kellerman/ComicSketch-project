using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly ComicDbContext _context;
    private readonly AesEncryptionService _aes;

    public UsersController(ComicDbContext context, AesEncryptionService aes)
    {
        _context = context;
        _aes = aes;
    }

    private object ToPublicDto(User u) => new
    {
        u.UserId,
        u.UserName,
        u.FullName,
        IdentityCard = _aes.TryDecrypt(u.IdentityCard),
        u.PhoneNumber,
        u.Email,
        u.UserType,
        u.ClubId
    };

    // 1. לקבלת כל המשתמשים — ללא שדה הסיסמה
    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
        try
        {
            var users = await _context.Users.ToListAsync();
            return Ok(users.Select(ToPublicDto));
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"שגיאה פנימית בשרת: {ex.Message}");
        }
    }

    // 2. הרשמה: Hash לסיסמה, הצפנת תעודת זהות
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] User newUser)
    {
        try
        {
            if (newUser == null) return BadRequest("נתוני משתמש ריקים");

            var exists = await _context.Users.AnyAsync(u => u.UserName == newUser.UserName);
            if (exists) return BadRequest("שם המשתמש כבר קיים במערכת");

            newUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newUser.PasswordHash);

            if (!string.IsNullOrEmpty(newUser.IdentityCard))
                newUser.IdentityCard = _aes.Encrypt(newUser.IdentityCard);

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();
            return Ok(ToPublicDto(newUser));
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"שגיאה בשמירת המשתמש: {ex.Message}");
        }
    }

    // 3. כניסה: BCrypt.Verify במקום השוואה ישירה
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] User loginRequest)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.UserName == loginRequest.UserName);

        if (user == null || !BCrypt.Net.BCrypt.Verify(loginRequest.PasswordHash, user.PasswordHash))
            return BadRequest("שם המשתמש או הסיסמה שגויים");

        return Ok(ToPublicDto(user));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] User updatedUser)
    {
        var existingUser = await _context.Users.FindAsync(id);
        if (existingUser == null)
            return NotFound("המשתמש לא נמצא במערכת");

        existingUser.UserName = updatedUser.UserName;
        existingUser.FullName = updatedUser.FullName;
        existingUser.PhoneNumber = updatedUser.PhoneNumber;
        existingUser.Email = updatedUser.Email;
        existingUser.ClubId = updatedUser.ClubId == 0 ? null : updatedUser.ClubId;

        // עדכון סיסמה רק אם נשלחה סיסמה חדשה (לא ריקה ולא כבר מוצפנת)
        if (!string.IsNullOrEmpty(updatedUser.PasswordHash) &&
            !updatedUser.PasswordHash.StartsWith("$2"))
            existingUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(updatedUser.PasswordHash);

        if (!string.IsNullOrEmpty(updatedUser.IdentityCard))
            existingUser.IdentityCard = _aes.Encrypt(updatedUser.IdentityCard);

        try
        {
            await _context.SaveChangesAsync();
            return Ok(ToPublicDto(existingUser));
        }
        catch (Exception ex)
        {
            var inner = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, $"שגיאה בעדכון הנתונים: {inner}");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound("המשתמש לא נמצא");

        _context.Users.Remove(user);
        try
        {
            await _context.SaveChangesAsync();
            return Ok("המשתמש נמחק בהצלחה");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"שגיאה במחיקת משתמש: {ex.Message}");
        }
    }
}
