using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mvo.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaLibraryFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultAltText",
                table: "MediaAsset",
                type: "varchar(300)",
                maxLength: 300,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "MediaAsset",
                type: "varchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            // Existing images get their original file name (without extension) as display name.
            migrationBuilder.Sql("""
                UPDATE MediaAsset SET Name = LEFT(
                    CASE WHEN LOCATE('.', OriginalFileName) > 0
                         THEN SUBSTRING(OriginalFileName, 1, CHAR_LENGTH(OriginalFileName) - CHAR_LENGTH(SUBSTRING_INDEX(OriginalFileName, '.', -1)) - 1)
                         ELSE OriginalFileName END, 200);
                """);

            migrationBuilder.CreateIndex(
                name: "IX_MediaAsset_CreatedUtc",
                table: "MediaAsset",
                column: "CreatedUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MediaAsset_CreatedUtc",
                table: "MediaAsset");

            migrationBuilder.DropColumn(
                name: "DefaultAltText",
                table: "MediaAsset");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "MediaAsset");
        }
    }
}
