using CinemaApp.Application.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace CinemaApp.WebApi.Filters;

public sealed class ApiExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        switch (context.Exception)
        {
            case ApiException apiEx:
                context.Result = new ObjectResult(new { code = apiEx.Code, @params = apiEx.Params })
                {
                    StatusCode = apiEx.StatusCode
                };
                context.ExceptionHandled = true;
                break;
            case UnauthorizedAccessException:
                context.Result = new UnauthorizedObjectResult(new { code = ErrorCodes.UserNotIdentified });
                context.ExceptionHandled = true;
                break;
        }
    }
}
