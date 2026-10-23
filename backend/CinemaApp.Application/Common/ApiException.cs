namespace CinemaApp.Application.Common;

public sealed class ApiException : Exception
{
    public string Code { get; }
    public int StatusCode { get; }
    public IReadOnlyDictionary<string, object>? Params { get; }

    public ApiException(string code, int statusCode = 400, IReadOnlyDictionary<string, object>? parameters = null)
        : base(code)
    {
        Code = code;
        StatusCode = statusCode;
        Params = parameters;
    }

    public static ApiException BadRequest(string code, IReadOnlyDictionary<string, object>? parameters = null)
        => new(code, 400, parameters);

    public static ApiException NotFound(string code)
        => new(code, 404);

    public static ApiException Unauthorized(string code)
        => new(code, 401);

    public static ApiException Forbidden(string code)
        => new(code, 403);
}
