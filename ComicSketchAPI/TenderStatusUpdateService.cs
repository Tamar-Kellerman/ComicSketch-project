using Microsoft.EntityFrameworkCore;

public class TenderStatusUpdateService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TenderStatusUpdateService> _logger;

    // השירות ירוץ פעם אחת בכל 24 שעות
    private readonly TimeSpan _interval = TimeSpan.FromHours(24);

    public TenderStatusUpdateService(IServiceScopeFactory scopeFactory, ILogger<TenderStatusUpdateService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("שירות עדכון סטטוס מכרזים הופעל");

        // הרצה ראשונה מיד עם עליית השרת
        await UpdateExpiredTenders();

        // לאחר מכן כל 24 שעות
        using var timer = new PeriodicTimer(_interval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await UpdateExpiredTenders();
        }
    }

    private async Task UpdateExpiredTenders()
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ComicDbContext>();

            var today = DateTime.UtcNow.Date;

            // מוצא את כל המכרזים הפתוחים שתאריך הסיום שלהם עבר
            var expiredTenders = await context.Tenders
                .Where(t => t.Status == "open" && t.EndDate.Date < today)
                .ToListAsync();

            if (expiredTenders.Count > 0)
            {
                foreach (var tender in expiredTenders)
                {
                    tender.Status = "close";
                }

                await context.SaveChangesAsync();
                _logger.LogInformation($"עודכנו {expiredTenders.Count} מכרזים שפג תוקפם");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError($"שגיאה בעדכון סטטוס מכרזים: {ex.Message}");
        }
    }
}
