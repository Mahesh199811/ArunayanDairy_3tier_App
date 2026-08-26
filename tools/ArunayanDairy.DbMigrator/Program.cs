using ArunayanDairy.Api.Data;
using Microsoft.EntityFrameworkCore;

var dbHost = Environment.GetEnvironmentVariable("DB_HOST");
var dbPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "3306";
var dbUser = Environment.GetEnvironmentVariable("DB_USER");
var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD");

var databaseName = "ArunayanDairy";

if (string.IsNullOrWhiteSpace(dbHost) ||
    string.IsNullOrWhiteSpace(dbUser) ||
    string.IsNullOrWhiteSpace(dbPassword))
{
    throw new InvalidOperationException(
        "DB_HOST, DB_USER and DB_PASSWORD environment variables are required.");
}

var serverConnectionString =
    $"Server={dbHost};" +
    $"Port={dbPort};" +
    $"User={dbUser};" +
    $"Password={dbPassword};";

var databaseConnectionString =
    $"{serverConnectionString}Database={databaseName};";

var options = new DbContextOptionsBuilder<ArunayanDairyDbContext>()
    .UseMySql(
        databaseConnectionString,
        ServerVersion.AutoDetect(databaseConnectionString))
    .Options;

await using var db = new ArunayanDairyDbContext(options);

Console.WriteLine("Applying ArunayanDairy database migrations...");

await db.Database.MigrateAsync();

Console.WriteLine("Database migration completed successfully.");