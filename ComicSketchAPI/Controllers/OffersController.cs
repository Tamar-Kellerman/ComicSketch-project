using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class OffersController : ControllerBase
{
    private readonly ComicDbContext _context;
    private readonly IWebHostEnvironment _env;

    private static readonly string[] AllowedExtensions = { ".png", ".jpg", ".jpeg", ".pdf", ".doc", ".docx" };

    public OffersController(ComicDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    // POST /api/offers  (multipart/form-data) – up to 5 files
    [HttpPost]
    public async Task<IActionResult> SubmitOffer(
        [FromForm] int tenderId,
        [FromForm] int artistId,
        [FromForm] decimal? priceQuote,
        [FromForm] string? offerDescription,
        [FromForm] List<IFormFile> files)
    {
        if (files == null || files.Count == 0)
            return BadRequest("No files uploaded.");

        if (files.Count > 5)
            return BadRequest("You can upload a maximum of 5 files.");

        var uploadsDir = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads");
        Directory.CreateDirectory(uploadsDir);

        var savedLinks = new List<string>();
        foreach (var file in files)
        {
            if (file.Length == 0) continue;
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return BadRequest($"File '{file.FileName}' is not allowed. Allowed types: PNG, JPG, PDF, DOC, DOCX.");

            var uniqueName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadsDir, uniqueName);
            using (var stream = new FileStream(filePath, FileMode.Create))
                await file.CopyToAsync(stream);

            savedLinks.Add($"/uploads/{uniqueName}");
        }

        if (savedLinks.Count == 0)
            return BadRequest("No valid files were uploaded.");

        var offer = new Offer
        {
            TenderId = tenderId,
            ArtistId = artistId,
            PriceQuote = priceQuote,
            OfferDescription = offerDescription,
            OfferLink = string.Join(",", savedLinks),
            SubmissionDate = DateTime.UtcNow,
        };

        _context.Offers.Add(offer);
        await _context.SaveChangesAsync();

        return Ok(new { offer.OfferId, offer.OfferLink });
    }

    // GET /api/offers?tenderId=X  OR  ?artistId=X  OR  ?writerId=X
    [HttpGet]
    public async Task<IActionResult> GetOffers(
        [FromQuery] int? tenderId,
        [FromQuery] int? artistId,
        [FromQuery] int? writerId)
    {
        var query = _context.Offers
            .Include(o => o.Artist)
            .Include(o => o.Tender)
                .ThenInclude(t => t!.User)
            .AsQueryable();

        if (tenderId.HasValue)
            query = query.Where(o => o.TenderId == tenderId.Value);
        else if (artistId.HasValue)
            query = query.Where(o => o.ArtistId == artistId.Value);
        else if (writerId.HasValue)
            query = query.Where(o => o.Tender != null && o.Tender.UserId == writerId.Value);
        else
            return BadRequest("Provide tenderId, artistId, or writerId.");

        var offers = await query
            .Select(o => new
            {
                o.OfferId,
                o.TenderId,
                o.PriceQuote,
                o.OfferDescription,
                o.OfferLink,
                o.SubmissionDate,
                ArtistName = o.Artist != null ? o.Artist.FullName : "Unknown",
                WriterName = o.Tender != null && o.Tender.User != null ? o.Tender.User.FullName : "Unknown",
            })
            .OrderByDescending(o => o.SubmissionDate)
            .ToListAsync();

        return Ok(offers);
    }
}
