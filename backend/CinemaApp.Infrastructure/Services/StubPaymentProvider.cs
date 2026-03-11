using CinemaApp.Domain.Interfaces;

namespace CinemaApp.Infrastructure.Services;

public class StubPaymentProvider : IPaymentProvider
{
    public Task<PaymentResult> CreatePaymentAsync(int bookingId, decimal amount, string description)
    {
        return Task.FromResult(new PaymentResult
        {
            Success = true,
            PaymentUrl = $"/payment/stub?bookingId={bookingId}&amount={amount}",
            PaymentReference = $"STUB-{bookingId}-{Guid.NewGuid():N}"
        });
    }

    public Task<bool> VerifyPaymentAsync(string paymentReference)
    {
        return Task.FromResult(paymentReference.StartsWith("STUB-"));
    }
}
