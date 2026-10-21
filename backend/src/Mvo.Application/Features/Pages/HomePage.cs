namespace Mvo.Application.Features.Pages;

/// <summary>
/// The home page ("Forside"). It has a fixed design made of six parts, each a section with a <c>Key</c>. The starting
/// content is the text the site showed before it could be edited; the masons change it from the admin page.
/// </summary>
public static class HomePage
{
    public const int PageId = 1;
    public const string Slug = "forside";

    public const string Hero = "hero";
    public const string Trust = "trust";
    public const string Services = "services";
    public const string Features = "features";
    public const string Steps = "steps";
    public const string Projects = "projects";

    /// <summary>The parts that are shown as cards with an icon, a title and a text.</summary>
    public static readonly IReadOnlySet<string> CardParts = new HashSet<string> { Trust, Features, Steps };

    /// <summary>The parts with an overtext and a heading of their own.</summary>
    public static readonly IReadOnlySet<string> HeadingParts = new HashSet<string> { Hero, Services, Steps, Projects };

    /// <summary>The design has room for exactly this many cards in each card part.</summary>
    public const int CardCount = 4;
    public const int HeroPointsMax = 6;
    public const int CardTitleMax = 100;
    public const int CardTextMax = 300;

    /// <summary>Icons the masons can choose for a card. The site knows how to draw each of them.</summary>
    public static readonly IReadOnlyList<string> Icons =
    [
        "shield", "check", "user", "location-dot", "face-smile", "message", "file-lines", "phone", "hammer", "circle-check",
        "star", "clock", "house", "handshake", "award", "trowel",
    ];

    public record Card(string Icon, string Title, string Text);

    public record Part(string Key, string Title, string? Eyebrow, string Description, IReadOnlyList<string> Points, IReadOnlyList<Card> Cards);

    /// <summary>The parts in page order, with the content they start with.</summary>
    public static readonly IReadOnlyList<Part> Parts =
    [
        new(Hero, "Din murer i København", "Kvalitet • Tillid • Holdbare løsninger",
            "Badeværelser, flisearbejde og reparationer udført med kvalitet ned til detaljen",
            ["Speciale i badeværelser", "Kvalitet ned til detaljen", "Klar kommunikation", "Personlig rådgivning"], []),
        new(Trust, "Tillidsfelter", null, "", [],
        [
            new("shield", "15+ års erfaring", "Solidt håndværk og mange tilfredse kunder"),
            new("check", "Gratis og uforpligtende", "Få et tilbud helt gratis – uden bindinger"),
            new("user", "Fast kontaktperson", "Du har den samme kontakt fra tilbud til aflevering"),
            new("location-dot", "København & omegn", "Vi hjælper hele København og Nordsjælland"),
        ]),
        new(Services, "Vi løser dine mureropgaver", "Vores ydelser", "", [], []),
        new(Features, "Fordele", null, "", [],
        [
            new("face-smile", "100% tilfredshed", "Vi går aldrig, før du er fuldt tilfreds."),
            new("message", "Klar kommunikation", "Du får løbende besked og fuldt overblik."),
            new("file-lines", "Gennemsigtige aftaler", "Ingen skjulte omkostninger – kun klare aftaler."),
            new("shield", "Forsikringssager", "Vi hjælper med reparationer efter skader."),
        ]),
        new(Steps, "En tryg proces fra start til slut", "Sådan arbejder vi", "", [],
        [
            new("phone", "Kontakt os", "Fortæl os om din opgave via formularen eller ring til os."),
            new("file-lines", "Vi giver dig et tilbud", "Du modtager et gratis og uforpligtende tilbud."),
            new("hammer", "Vi udfører opgaven", "Vi går i gang til aftalt tid og leverer håndværk i højeste kvalitet."),
            new("circle-check", "Levering & opfølgning", "Vi gennemgår arbejdet sammen med dig og sikrer, at alt er, som det skal være."),
        ]),
        new(Projects, "Se et udvalg af vores arbejde", "Seneste projekter", "", [], []),
    ];
}
