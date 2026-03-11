namespace CinemaApp.Domain.Interfaces;

public interface IPaymentProvider
{
    Task<PaymentResult> CreatePaymentAsync(int bookingId, decimal amount, string description);
    Task<bool> VerifyPaymentAsync(string paymentReference);
}

public class PaymentResult
{
    public bool Success { get; set; }
    public string? PaymentUrl { get; set; }
    public string? PaymentReference { get; set; }
    public string? ErrorMessage { get; set; }
}
