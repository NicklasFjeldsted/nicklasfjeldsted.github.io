using Microsoft.EntityFrameworkCore.Migrations;
using Mvo.Application.Domain;
using Mvo.Application.Features.Pages;

#nullable disable

namespace Mvo.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHomePage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "SectionDetail",
                type: "varchar(300)",
                maxLength: 300,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Icon",
                table: "SectionDetail",
                type: "varchar(30)",
                maxLength: 30,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "SectionKey",
                table: "ContentSection",
                type: "varchar(30)",
                maxLength: 30,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "ContentPage",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "HasFixedLayout", "IsManaged" },
                values: new object[] { true, true });

            migrationBuilder.InsertData(
                table: "SectionType",
                columns: new[] { "Id", "DisplayName", "HasGallery", "HasPrimaryImage", "Name" },
                values: new object[] { 5, "Del af forsiden", false, true, "HomePart" });

            // The home page's six fixed parts, with the content the site showed before it could be edited.
            var order = 1;
            foreach (var part in HomePage.Parts)
            {
                migrationBuilder.InsertData(
                    table: "ContentSection",
                    columns: new[] { "PageId", "SectionTypeId", "SectionKey", "Title", "Eyebrow", "Description", "DisplayOrder", "IsPublished", "Version" },
                    values: new object[] { HomePage.PageId, (int)SectionTypeId.HomePart, part.Key, part.Title, part.Eyebrow, part.Description, order++, true, 1 });

                var details = part.Points.Select(p => (Text: p, Description: (string)null, Icon: (string)null))
                    .Concat(part.Cards.Select(c => (Text: c.Title, Description: c.Text, Icon: c.Icon)));
                var position = 1;
                foreach (var d in details)
                {
                    migrationBuilder.Sql(
                        "INSERT INTO `SectionDetail` (`SectionId`, `Text`, `Description`, `Icon`, `DisplayOrder`) " +
                        $"SELECT `Id`, {Quote(d.Text)}, {Quote(d.Description)}, {Quote(d.Icon)}, {position++} FROM `ContentSection` " +
                        $"WHERE `PageId` = {HomePage.PageId} AND `SectionKey` = {Quote(part.Key)};");
                }
            }
        }

        private static string Quote(string value) => value is null ? "NULL" : "'" + value.Replace("'", "''") + "'";

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql($"DELETE FROM `ContentSection` WHERE `PageId` = {HomePage.PageId};");

            migrationBuilder.DeleteData(
                table: "SectionType",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DropColumn(
                name: "Description",
                table: "SectionDetail");

            migrationBuilder.DropColumn(
                name: "Icon",
                table: "SectionDetail");

            migrationBuilder.DropColumn(
                name: "SectionKey",
                table: "ContentSection");

            migrationBuilder.UpdateData(
                table: "ContentPage",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "HasFixedLayout", "IsManaged" },
                values: new object[] { false, false });
        }
    }
}
