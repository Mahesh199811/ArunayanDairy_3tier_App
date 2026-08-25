using ArunayanDairy.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ArunayanDairy.Api.Data;

public class ArunayanDairyDbContext : DbContext
{
    public ArunayanDairyDbContext(
        DbContextOptions<ArunayanDairyDbContext> options)
        : base(options)
    {
    }

    public DbSet<Product> Products => Set<Product>();
}