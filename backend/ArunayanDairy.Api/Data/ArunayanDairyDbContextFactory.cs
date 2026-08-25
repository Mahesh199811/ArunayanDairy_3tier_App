using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ArunayanDairy.Api.Data;

public sealed class ArunayanDairyDbContextFactory : IDesignTimeDbContextFactory<ArunayanDairyDbContext>
{
    public ArunayanDairyDbContext CreateDbContext(string[] args)
    {
        const string connectionString =
            "Server=localhost;Port=3306;Database=ArunayanDairy;User=design;Password=design;";

        var optionsBuilder = new DbContextOptionsBuilder<ArunayanDairyDbContext>();
        optionsBuilder.UseMySql(
            connectionString,
            new MySqlServerVersion(new Version(8, 0, 0)));

        return new ArunayanDairyDbContext(optionsBuilder.Options);
    }
}
