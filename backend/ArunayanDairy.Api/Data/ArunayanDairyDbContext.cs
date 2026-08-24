using Microsoft.EntityFrameworkCore;

namespace ArunayanDairy.Api.Data;

public class ArunayanDairyDbContext : DbContext
{
    public ArunayanDairyDbContext(
        DbContextOptions<ArunayanDairyDbContext> options)
        : base(options)
    {
    }
}