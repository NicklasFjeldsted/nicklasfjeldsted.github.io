using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Mvo.Application.Abstractions;
using Mvo.Application.Common;

namespace Mvo.Application.Features.Auth;

public record LoginCommand(string Email, string Password) : IRequest<TokenResult>;

public class LoginValidator : AbstractValidator<LoginCommand>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email).NotEmpty().MaximumLength(254);
        RuleFor(x => x.Password).NotEmpty().MaximumLength(200);
    }
}

public class LoginHandler(IAppDbContext db, IPasswordVerifier verifier, ITokenIssuer tokens) : IRequestHandler<LoginCommand, TokenResult>
{
    public async Task<TokenResult> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.AdminUsers.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

        if (user is null || !verifier.Verify(user.PasswordHash, request.Password))
            throw new UnauthorizedLoginException();

        return tokens.Issue(user);
    }
}
