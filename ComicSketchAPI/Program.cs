using Microsoft.EntityFrameworkCore;
using Npgsql;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// 1. חיבור ה-DbContext למסד הנתונים PostgreSQL
builder.Services.AddDbContext<ComicDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. הגדרת CORS מעודכנת - מאפשרת ל-React בפורט 5173 (ולכל פורט אחר) לעבוד חלק
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy => 
        policy.AllowAnyOrigin()   // מאפשר לכל פורט (כולל 5173 ו-3000) לגשת
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// 3. רישום שירות ה-HttpClient (חובה עבור שליחת הבקשות לשרת הפייתון בקונטרולר)
builder.Services.AddHttpClient("PythonClient", client =>
{
    client.Timeout = TimeSpan.FromMinutes(5); // <--- להוסיף את השורה הזו!
});
// רישום שירות הרקע לעדכון סטטוס מכרזים אוטומטי
builder.Services.AddSingleton<AesEncryptionService>();
builder.Services.AddHostedService<TenderStatusUpdateService>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

// הפעלת ה-CORS והקונטרולרים בתוך השרת
app.UseCors("AllowReact");
app.UseStaticFiles(); // serves wwwroot/uploads/...
app.UseAuthorization();
app.MapControllers();

app.Run();