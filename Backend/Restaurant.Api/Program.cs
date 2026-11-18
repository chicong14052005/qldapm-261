using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Restaurant.Api.Data;
using Restaurant.Api.Domain;
using Restaurant.Api.Services;

var builder=WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDb>(o=>o.UseNpgsql(builder.Configuration.GetConnectionString("Database"),np=>np.CommandTimeout(20)));
builder.Services.AddScoped<ApiService>();
builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo("/keys")).SetApplicationName("RestaurantOrdering");
builder.Services.AddAntiforgery(o=>{o.HeaderName="X-CSRF-TOKEN";o.Cookie.Name="ros_csrf";o.Cookie.SameSite=SameSiteMode.Lax;});
builder.Services.AddRateLimiter(o=>
{
    o.RejectionStatusCode=429;
    o.OnRejected=async(context,token)=>
    {
        context.HttpContext.Response.Headers.RetryAfter="60";
        await context.HttpContext.Response.WriteAsJsonAsync(new {type="about:blank",title="RATE_LIMITED",status=429,code="RATE_LIMITED",detail="Quá nhiều yêu cầu. Vui lòng thử lại sau một phút.",traceId=context.HttpContext.TraceIdentifier},token);
    };
    o.AddPolicy("login",ctx=>RateLimitPartition.GetFixedWindowLimiter(ctx.Connection.RemoteIpAddress?.ToString()??"local",_=>new(){PermitLimit=10,Window=TimeSpan.FromMinutes(1),QueueLimit=0}));
    o.AddPolicy("join",ctx=>RateLimitPartition.GetFixedWindowLimiter(ctx.Connection.RemoteIpAddress?.ToString()??"local",_=>new(){PermitLimit=60,Window=TimeSpan.FromMinutes(1),QueueLimit=0}));
});
var app=builder.Build();
if(args.Contains("--migrate"))
{
    await using var scope=app.Services.CreateAsyncScope();var db=scope.ServiceProvider.GetRequiredService<AppDb>();
    await db.Database.MigrateAsync();await Seed.Run(db,builder.Configuration,scope.ServiceProvider.GetRequiredService<IDataProtectionProvider>());Console.WriteLine("Migration and local demo seed completed.");return;
}
app.Use(async(ctx,next)=>
{
    try
    {
        var api=ctx.RequestServices.GetRequiredService<ApiService>();
        if(!ctx.Request.Path.StartsWithSegments("/health"))await api.Authenticate(ctx);
        if(ctx.Request.Method is not ("GET" or "HEAD" or "OPTIONS"))
        {
            var origin=ctx.Request.Headers.Origin.ToString();var allowed=builder.Configuration["PublicOrigin"]??"http://localhost:3000";
            Rules.Require(string.IsNullOrEmpty(origin)||origin==allowed,"CSRF_FAILED","Origin không được phép.",403);
            await ctx.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(ctx);
        }
        await next();
    }
    catch(Exception ex)
    {
        var pg=ex as PostgresException??(ex as DbUpdateException)?.InnerException as PostgresException;
        var status=ex switch {ApiException e=>e.Status,AntiforgeryValidationException=>403,JsonException or FormatException or InvalidOperationException when ex is not DbUpdateException=>422,DbUpdateConcurrencyException=>409,_=>pg?.SqlState is "23505" or "23514" or "23503"?409:500};
        var code=ex is ApiException ae?ae.Code:ex is AntiforgeryValidationException?"CSRF_FAILED":status==409?"DATA_CONFLICT":status==422?"VALIDATION_FAILED":"INTERNAL_ERROR";
        if(status==500)app.Logger.LogError(ex,"Request failed {TraceId}",ctx.TraceIdentifier);
        ctx.Response.StatusCode=status;ctx.Response.ContentType="application/problem+json";
        await ctx.Response.WriteAsJsonAsync(new {type="about:blank",title=code,status,code,detail=status==500?"Đã xảy ra lỗi. Vui lòng cung cấp traceId để kiểm tra.":ex is ApiException?ex.Message:status==409?"Dữ liệu xung đột hoặc không thỏa điều kiện. Hãy tải lại trạng thái mới nhất.":status==403?"CSRF token không hợp lệ. Hãy lấy lại token và thử lại.":"JSON hoặc dữ liệu đầu vào không hợp lệ.",traceId=ctx.TraceIdentifier});
    }
});
app.UseRateLimiter();
app.MapGet("/health/live",()=>new {status="ok"});
app.MapGet("/health/ready",async(AppDb db)=>await db.Database.CanConnectAsync()?Results.Ok(new {status="ready"}):Results.StatusCode(503));
app.MapGet("/api/v1/auth/csrf",(HttpContext c,IAntiforgery f)=>new {token=f.GetAndStoreTokens(c).RequestToken});
app.MapGet("/api/v1/openapi.json",()=>Results.File(Path.Combine(AppContext.BaseDirectory,"openapi.json"),"application/json"));
app.MapPost("/api/v1/auth/login",async(HttpContext c,ApiService s)=>await s.Login(await ApiService.Body(c))).RequireRateLimiting("login");
app.MapGet("/api/v1/auth/me",(ApiService s)=>s.Me());
app.MapPost("/api/v1/auth/logout",(ApiService s)=>s.Logout());
app.MapPost("/api/v1/auth/change-password",async(HttpContext c,ApiService s)=>await s.ChangePassword(await ApiService.Body(c)));
app.MapGet("/api/v1/staff",(ApiService s)=>s.StaffList());
app.MapPost("/api/v1/staff",async(HttpContext c,ApiService s)=>await s.StaffCreate(await ApiService.Body(c)));
app.MapPatch("/api/v1/staff/{id:guid}",async(Guid id,HttpContext c,ApiService s)=>await s.StaffUpdate(id,await ApiService.Body(c),"profile"));
app.MapPut("/api/v1/staff/{id:guid}/roles",async(Guid id,HttpContext c,ApiService s)=>await s.StaffUpdate(id,await ApiService.Body(c),"roles"));
app.MapPost("/api/v1/staff/{id:guid}/reset-password",async(Guid id,HttpContext c,ApiService s)=>await s.StaffUpdate(id,await ApiService.Body(c),"reset-password"));
app.MapGet("/api/v1/menu",(ApiService s)=>s.Menu());
app.MapGet("/api/v1/manage/menu-items",(ApiService s)=>s.Menu(true));
app.MapPost("/api/v1/menu-categories",async(HttpContext c,ApiService s)=>await s.CategoryWrite(null,await ApiService.Body(c)));
app.MapPatch("/api/v1/menu-categories/{id:guid}",async(Guid id,HttpContext c,ApiService s)=>await s.CategoryWrite(id,await ApiService.Body(c)));
app.MapPost("/api/v1/menu-items",async(HttpContext c,ApiService s)=>await s.MenuWrite(null,await ApiService.Body(c)));
app.MapPatch("/api/v1/menu-items/{id:guid}",async(Guid id,HttpContext c,ApiService s)=>await s.MenuWrite(id,await ApiService.Body(c)));
app.MapPatch("/api/v1/menu-items/{id:guid}/availability",async(Guid id,HttpContext c,ApiService s)=>await s.MenuWrite(id,await ApiService.Body(c),true));
app.MapGet("/api/v1/tables",(ApiService s)=>s.Tables());
app.MapPost("/api/v1/tables",async(HttpContext c,ApiService s)=>await s.TableWrite(null,await ApiService.Body(c)));
app.MapPatch("/api/v1/tables/{id:guid}",async(Guid id,HttpContext c,ApiService s)=>await s.TableWrite(id,await ApiService.Body(c)));
app.MapPost("/api/v1/tables/{id:guid}/qr/rotate",async(Guid id,HttpContext c,ApiService s)=>await s.QrRotate(id,await ApiService.Body(c)));
app.MapPost("/api/v1/tables/{id:guid}/qr/unlock",async(Guid id,HttpContext c,ApiService s)=>await s.UnlockGuestQr(id,await ApiService.Body(c)));
app.MapGet("/api/v1/tables/{id:guid}/qr",(Guid id,ApiService s)=>s.TableQr(id));
app.MapGet("/api/v1/qr/{token}",(string token,ApiService s)=>s.QrRead(token));
app.MapPost("/api/v1/tables/{id:guid}/visits",async(Guid id,HttpContext c,ApiService s)=>await s.OpenVisit(id,await ApiService.Body(c)));
app.MapPost("/api/v1/guest/join",async(HttpContext c,ApiService s)=>await s.Join(await ApiService.Body(c))).RequireRateLimiting("join");
app.MapGet("/api/v1/guest/current",(ApiService s)=>s.GuestCurrent());
app.MapGet("/api/v1/orders",(ApiService s)=>s.OrdersList());
app.MapGet("/api/v1/orders/{id:guid}",(Guid id,ApiService s)=>s.OrderRead(id));
app.MapPost("/api/v1/takeaway-orders",async(HttpContext c,ApiService s)=>await s.Takeaway(await ApiService.Body(c)));
app.MapPost("/api/v1/orders/{id:guid}/batches",async(Guid id,HttpContext c,ApiService s)=>await s.Submit(id,await ApiService.Body(c)));
app.MapGet("/api/v1/approval-batches",(ApiService s)=>s.Approvals());
app.MapPost("/api/v1/batches/{id:guid}/approve",async(Guid id,HttpContext c,ApiService s)=>await s.Review(id,await ApiService.Body(c),"APPROVED"));
app.MapPost("/api/v1/batches/{id:guid}/reject",async(Guid id,HttpContext c,ApiService s)=>await s.Review(id,await ApiService.Body(c),"REJECTED"));
app.MapPost("/api/v1/batches/{id:guid}/withdraw",async(Guid id,HttpContext c,ApiService s)=>await s.Review(id,await ApiService.Body(c),"WITHDRAWN"));
app.MapGet("/api/v1/kitchen/items",(ApiService s)=>s.Queue());
app.MapGet("/api/v1/kitchen/changes",(ApiService s)=>s.Changes());
app.MapPost("/api/v1/order-items/{id:guid}/accept",async(Guid id,HttpContext c,ApiService s)=>await s.ItemAction(id,await ApiService.Body(c),"accept"));
app.MapPost("/api/v1/order-items/{id:guid}/prepare",async(Guid id,HttpContext c,ApiService s)=>await s.ItemAction(id,await ApiService.Body(c),"prepare"));
app.MapPost("/api/v1/order-items/{id:guid}/ready",async(Guid id,HttpContext c,ApiService s)=>await s.ItemAction(id,await ApiService.Body(c),"ready"));
app.MapPatch("/api/v1/order-items/{id:guid}",async(Guid id,HttpContext c,ApiService s)=>await s.ItemAction(id,await ApiService.Body(c),"amend"));
app.MapPost("/api/v1/order-items/{id:guid}/cancel",async(Guid id,HttpContext c,ApiService s)=>await s.ItemAction(id,await ApiService.Body(c),"cancel"));
app.MapPost("/api/v1/orders/{id:guid}/cancel",async(Guid id,HttpContext c,ApiService s)=>await s.CancelOrder(id,await ApiService.Body(c)));
app.MapGet("/api/v1/serving/items",(ApiService s)=>s.Queue(true));
app.MapPost("/api/v1/order-items/{id:guid}/serve",async(Guid id,HttpContext c,ApiService s)=>await s.ItemAction(id,await ApiService.Body(c),"serve"));
app.MapGet("/api/v1/checkout/orders",(ApiService s)=>s.OrdersList(true));
app.MapGet("/api/v1/admin/payments",(ApiService s)=>s.PaymentHistory());
app.MapGet("/api/v1/admin/payments/{id:guid}",(Guid id,ApiService s)=>s.PaymentHistoryDetail(id));
app.MapPost("/api/v1/orders/{id:guid}/request-payment",async(Guid id,HttpContext c,ApiService s)=>await s.RequestPayment(id,await ApiService.Body(c)));
app.MapPost("/api/v1/orders/{id:guid}/reopen",async(Guid id,HttpContext c,ApiService s)=>await s.Reopen(id,await ApiService.Body(c)));
app.MapPost("/api/v1/orders/{id:guid}/payments",async(Guid id,HttpContext c,ApiService s)=>await s.Pay(id,await ApiService.Body(c)));
app.MapGet("/api/v1/orders/{id:guid}/receipt",(Guid id,ApiService s)=>s.Receipt(id));
app.MapGet("/api/v1/requests/{key:guid}",(Guid key,ApiService s)=>s.RequestStatus(key));
app.Run();
