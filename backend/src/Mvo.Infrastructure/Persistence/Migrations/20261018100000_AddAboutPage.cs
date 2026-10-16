using Microsoft.EntityFrameworkCore.Migrations;
using Mvo.Application.Features.Pages;

#nullable disable

namespace Mvo.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAboutPage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasFixedLayout",
                table: "ContentPage",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "ContentPage",
                keyColumn: "Id",
                keyValue: 1,
                column: "HasFixedLayout",
                value: false);

            migrationBuilder.UpdateData(
                table: "ContentPage",
                keyColumn: "Id",
                keyValue: 2,
                column: "HasFixedLayout",
                value: false);

            migrationBuilder.InsertData(
                table: "ContentPage",
                columns: new[] { "Id", "Eyebrow", "HasFixedLayout", "Heading", "Introduction", "IsManaged", "Name", "Slug", "Version" },
                values: new object[] { 3, "Om os", true, "Håndværk med stolthed", "Murerfirmaet MVO er et lille, lokalt murerfirma i København med speciale i badeværelser, fliser og reparationer.", true, "Om os", "om-os", 1 });

            migrationBuilder.InsertData(
                table: "SectionType",
                columns: new[] { "Id", "DisplayName", "HasGallery", "HasPrimaryImage", "Name" },
                values: new object[] { 4, "Profil med billede", false, true, "Profile" });

            // The page's one fixed section: the mason's photo, name, role and story.
            migrationBuilder.InsertData(
                table: "ContentSection",
                columns: new[] { "PageId", "SectionTypeId", "Title", "Eyebrow", "Description", "DisplayOrder", "IsPublished", "Version" },
                values: new object[] { 3, 4, AboutPage.ProfileName, AboutPage.ProfileRole, AboutPage.ProfileStory, 1, true, 1 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM `ContentSection` WHERE `PageId` = 3;");

            migrationBuilder.DeleteData(
                table: "ContentPage",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "SectionType",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DropColumn(
                name: "HasFixedLayout",
                table: "ContentPage");
        }
    }
}
