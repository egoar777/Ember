namespace CinemaApp.Application.Common;

/// <summary>Коды ошибок API — локализуются на клиенте.</summary>
public static class ErrorCodes
{
    public const string ScreeningNotFound = "screening_not_found";
    public const string MovieArchived = "movie_archived";
    public const string ScreeningAlreadyStartedOrEnded = "screening_already_started_or_ended";
    public const string ScreeningAlreadyStarted = "screening_already_started";
    public const string SeatsInvalid = "seats_invalid";
    public const string SeatUnavailable = "seat_unavailable";
    public const string BookingNotFound = "booking_not_found";
    public const string BookingAccessDenied = "booking_access_denied";
    public const string BookingNotPendingPayment = "booking_not_pending_payment";
    public const string BookingNoPaymentReference = "booking_no_payment_reference";
    public const string PaymentVerificationFailed = "payment_verification_failed";
    public const string PaymentInitFailed = "payment_init_failed";
    public const string SeatNotFound = "seat_not_found";
    public const string SeatNotInBooking = "seat_not_in_booking";
    public const string FoodNotFound = "food_not_found";
    public const string EmptyCart = "empty_cart";
    public const string BookingNotPending = "booking_not_pending";
    public const string EmailAlreadyRegistered = "email_already_registered";
    public const string InvalidCredentials = "invalid_credentials";
    public const string GoogleAuthFailed = "google_auth_failed";
    public const string UseGoogleLogin = "use_google_login";
    public const string InvalidRefreshToken = "invalid_refresh_token";
    public const string ListNotFound = "list_not_found";
    public const string ItemAlreadyInList = "item_already_in_list";
    public const string ItemNotFound = "item_not_found";
    public const string MovieNotFound = "movie_not_found";
    public const string NotificationNotFound = "notification_not_found";
    public const string UserNotIdentified = "user_not_identified";
    public const string ScreeningCancelled = "screening_cancelled";
    public const string NewsNotFound = "news_not_found";
    public const string CommentNotFound = "comment_not_found";
    public const string ReviewNotFound = "review_not_found";
    public const string Generic = "generic";
}
