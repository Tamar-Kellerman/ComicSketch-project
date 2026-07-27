using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
public class ComicDbContext : DbContext
{
    public ComicDbContext(DbContextOptions<ComicDbContext> options) : base(options) { }

    // מקשר בין קוד ה-C# לטבלת users במסד הנתונים
    public DbSet<User> Users { get; set; }
    public DbSet<Club> Clubs { get; set; }
    public DbSet<Sketch> Sketches { get; set; }
    public DbSet<Tender> Tenders { get; set; }
    public DbSet<Offer> Offers { get; set; }
}

// ייצוג של שורת משתמש יחידה מהטבלה
[Table("users")] 
public class User
{
    [Key]
    [Column("user_id")]
    public int UserId { get; set; }

    [Column("user_name")]
    public string UserName { get; set; } = string.Empty;

    [Column("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;

    [Column("full_name")]
    public string FullName { get; set; } = string.Empty;

    [Column("identity_card")] // השדה החדש שהיה חסר!
    public string IdentityCard { get; set; } = string.Empty;

    [Column("phone_number")]
    public string? PhoneNumber { get; set; }

    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Column("user_type")]
    public string UserType { get; set; } = string.Empty;

    [Column("club_id")]
    public int? ClubId { get; set; }
}
[Table("sketches")]
public class Sketch
{
    [Key]
    [Column("sketch_id")]
    public int SketchId { get; set; }

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("sketch_link")]
    public string SketchLink { get; set; } = string.Empty;

    [Column("original_story")]
    public string OriginalStory { get; set; } = string.Empty;

    [Column("characters_json", TypeName = "jsonb")]
    public string? CharactersJson { get; set; }

    [Column("scenes_json", TypeName = "jsonb")]
    public string? ScenesJson { get; set; }

    [Column("sketch_title")]
    public string? SketchTitle { get; set; }

    [Column("locations_json")]
    public string? LocationsJson { get; set; }
}

[Table("tenders")]
public class Tender
{
    [Key]
    [Column("tender_id")]
    public int TenderId { get; set; }

    [Column("status")]
    public string Status { get; set; } = "open";

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("sketch_id")]
    public int? SketchId { get; set; }

    [Column("start_date")]
    public DateTime StartDate { get; set; }

    [Column("end_date")]
    public DateTime EndDate { get; set; }

    [Column("additional_details")]
    public string? AdditionalDetails { get; set; }

    // Navigation properties לשליפת שם הסופר
    public User? User { get; set; }
    public Sketch? Sketch { get; set; }
}

[Table("offers")]
public class Offer
{
    [Key]
    [Column("offer_id")]
    public int OfferId { get; set; }

    [Column("tender_id")]
    public int TenderId { get; set; }

    [Column("artist_id")]
    public int ArtistId { get; set; }

    [Column("price_quote")]
    public decimal? PriceQuote { get; set; }

    [Column("offer_description")]
    public string? OfferDescription { get; set; }

    [Column("submission_date")]
    public DateTime SubmissionDate { get; set; } = DateTime.UtcNow;

    [Column("offer_link")]
    public string OfferLink { get; set; } = string.Empty;

    [ForeignKey("TenderId")]
    public Tender? Tender { get; set; }

    [ForeignKey("ArtistId")]
    public User? Artist { get; set; }
}

[Table("clubs")]
public class Club
{
    [Key]
    [Column("club_id")]
    public int ClubId { get; set; }

    [Column("club_type")]
    public string ClubType { get; set; } = string.Empty; // שונה מ-ClubName ל-ClubType

    [Column("costs")]
    public decimal Costs { get; set; } // שונה מ-Price ל-Costs

    [Column("sketches_per_month")]
    public int SketchesPerMonth { get; set; }
}