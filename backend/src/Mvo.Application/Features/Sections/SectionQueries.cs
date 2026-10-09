using FluentValidation;
using MediatR;
using Mvo.Application.Common;

namespace Mvo.Application.Features.Sections;

public record GetSectionContentQuery(int PageId, int SectionId) : IRequest<SectionContentDto>;

public class GetSectionContentValidator : AbstractValidator<GetSectionContentQuery>
{
    public GetSectionContentValidator()
    {
        RuleFor(x => x.PageId).RequiredId();
        RuleFor(x => x.SectionId).RequiredId();
    }
}

public class GetSectionContentHandler(SectionContentLoader loader) : IRequestHandler<GetSectionContentQuery, SectionContentDto>
{
    public Task<SectionContentDto> Handle(GetSectionContentQuery request, CancellationToken cancellationToken) =>
        loader.LoadAsync(request.PageId, request.SectionId, cancellationToken);
}
