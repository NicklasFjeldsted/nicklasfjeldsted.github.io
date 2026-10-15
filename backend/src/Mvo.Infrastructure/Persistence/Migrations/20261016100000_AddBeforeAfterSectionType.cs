using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Mvo.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBeforeAfterSectionType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "SectionType",
                columns: new[] { "Id", "DisplayName", "HasGallery", "HasPrimaryImage", "Name" },
                values: new object[] { 3, "Før og efter", true, true, "BeforeAfter" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "SectionType",
                keyColumn: "Id",
                keyValue: 3);
        }
    }
}
