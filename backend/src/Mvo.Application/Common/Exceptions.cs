namespace Mvo.Application.Common;

public class NotFoundException(string message) : Exception(message);

public class ConflictException(string message) : Exception(message);

public class UnauthorizedLoginException() : Exception("Invalid email or password.");
