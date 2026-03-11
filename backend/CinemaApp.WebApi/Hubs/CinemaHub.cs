using Microsoft.AspNetCore.SignalR;

namespace CinemaApp.WebApi.Hubs;

public class CinemaHub : Hub
{
    public async Task JoinScreeningRoom(int screeningId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"screening-{screeningId}");
    }

    public async Task LeaveScreeningRoom(int screeningId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"screening-{screeningId}");
    }
}
