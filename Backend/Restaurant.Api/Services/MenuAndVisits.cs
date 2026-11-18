using System.Text;
using Microsoft.AspNetCore.DataProtection;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Restaurant.Api.Domain;

namespace Restaurant.Api.Services;
public partial class ApiService
{
    public async Task<object> Menu(bool manage=false)
    {
        if(manage) Require("MANAGER","ADMIN");
        var categories=await db.MenuCategories.AsNoTracking().Where(c=>manage || c.IsActive).OrderBy(c=>c.SortOrder).ToListAsync();
        var ids=categories.Select(c=>c.Id).ToArray();
        var query=db.MenuItems.AsNoTracking().Where(i=>ids.Contains(i.CategoryId) && (manage || i.IsActive));
        if(Http.Request.Query.TryGetValue("categoryId",out var cat) && Guid.TryParse(cat,out var categoryId)) query=query.Where(i=>i.CategoryId==categoryId);
        if(Http.Request.Query.TryGetValue("search",out var search) && !string.IsNullOrWhiteSpace(search)) query=query.Where(i=>EF.Functions.ILike(i.Name,"%"+search.ToString()+"%"));
        return new {categories,items=await query.OrderBy(i=>i.Name).ToListAsync(),serverTime=DateTimeOffset.UtcNow};
    }
    public async Task<IResult> CategoryWrite(Guid? id,JsonObject b) => await Command(b,async()=>
    {
        Require("MANAGER","ADMIN"); var c=id.HasValue?await Lock<MenuCategory>("menu_categories",id.Value):new MenuCategory();
        if(id.HasValue) {CheckVersion(c,b);c.Touch();} else db.MenuCategories.Add(c);
        if(b["code"]!=null || !id.HasValue) c.Code=Text(b,"code",32).ToUpperInvariant();
        if(b["name"]!=null || !id.HasValue)c.Name=Text(b,"name",100);
        if(b["sortOrder"]!=null)c.SortOrder=(int)Number(b,"sortOrder",0,int.MaxValue);
        c.IsActive=Flag(b,"isActive",c.IsActive); Audit("CATEGORY_SAVED","MENU_CATEGORY",c.Id,null,new {c.Code,c.Name,c.IsActive});return c;
    },false);
    public async Task<IResult> MenuWrite(Guid? id,JsonObject b,bool availability=false)=>await Command(b,async()=>
    {
        if(availability)Require("KITCHEN","MANAGER","ADMIN");else Require("MANAGER","ADMIN");
        Guid categoryId;
        if(id.HasValue)categoryId=await db.MenuItems.Where(i=>i.Id==id.Value).Select(i=>i.CategoryId).SingleOrDefaultAsync();
        else categoryId=Id(b,"categoryId");
        var nextCategory=b["categoryId"]==null?categoryId:Id(b,"categoryId");
        foreach(var cid in new[]{categoryId,nextCategory}.Distinct().Order()) await Lock<MenuCategory>("menu_categories",cid);
        var item=id.HasValue?await Lock<MenuItem>("menu_items",id.Value):new MenuItem {CategoryId=categoryId};
        if(id.HasValue){CheckVersion(item,b);item.Touch();}else db.MenuItems.Add(item);
        var before=new {item.Name,item.PriceVnd,item.IsAvailable,item.IsActive};
        if(availability)item.IsAvailable=Flag(b,"isAvailable");
        else
        {
            item.CategoryId=nextCategory;
            if(b["code"]!=null || !id.HasValue)item.Code=Text(b,"code",32).ToUpperInvariant();
            if(b["name"]!=null || !id.HasValue)item.Name=Text(b,"name",160);
            if(b["description"]!=null || !id.HasValue)item.Description=Text(b,"description",2000);
            if(b["priceVnd"]!=null || !id.HasValue)item.PriceVnd=Number(b,"priceVnd");
            if(b["imageUrl"]!=null || !id.HasValue)
            {
                var url=Text(b,"imageUrl",2048);Rules.Require((url.StartsWith("/menu/")&&!url.Contains("..")) || Uri.TryCreate(url,UriKind.Absolute,out var uri)&&uri.Scheme=="https","VALIDATION_FAILED","Ảnh phải là đường dẫn /menu/ hoặc URL HTTPS.",422);item.ImageUrl=url;
            }
            item.IsActive=Flag(b,"isActive",item.IsActive);
        }
        Audit("MENU_UPDATED","MENU_ITEM",item.Id,before,new {item.Name,item.PriceVnd,item.IsAvailable,item.IsActive});return item;
    },false);
    public async Task<object> Tables()
    {
        Require("WAITER","KITCHEN","CASHIER","MANAGER","ADMIN");
        var tables=await db.RestaurantTables.AsNoTracking().OrderBy(t=>t.Code).ToListAsync();
        var visits=await db.Visits.AsNoTracking().Where(v=>v.Status=="OPEN").ToListAsync();
        var orders=await db.Orders.AsNoTracking().Where(o=>o.VisitId!=null && o.Status!="PAID"&&o.Status!="CANCELLED").ToListAsync();
        var now=DateTimeOffset.UtcNow;
        var activeVisitIds=(await db.GuestSessions.AsNoTracking().Where(s=>s.RevokedAt==null&&s.ExpiresAt>now).Select(s=>s.VisitId).Distinct().ToListAsync()).ToHashSet();
        return new {items=tables.Select(t=>new {t.Id,t.Code,t.Capacity,t.IsActive,t.Version,visit=visits.Where(v=>v.TableId==t.Id).Select(v=>new {v.Id,v.PartySize,v.Version,orderId=orders.FirstOrDefault(o=>o.VisitId==v.Id)?.Id,hasActiveGuestSession=activeVisitIds.Contains(v.Id)}).FirstOrDefault()})};
    }
    public async Task<IResult> TableWrite(Guid? id,JsonObject b)=>await Command(b,async()=>
    {
        Require("MANAGER","ADMIN");var t=id.HasValue?await Lock<RestaurantTable>("restaurant_tables",id.Value):new RestaurantTable();
        if(!id.HasValue){var raw=Token();t.QrTokenHash=Hash(raw);t.QrTokenCiphertext=qrProtector.Protect(Encoding.UTF8.GetBytes(raw));}
        if(id.HasValue){CheckVersion(t,b);Rules.Require(!await db.Visits.AnyAsync(v=>v.TableId==t.Id&&v.Status=="OPEN"),"TABLE_OCCUPIED","Không sửa bàn đang có khách.");t.Touch();}else db.RestaurantTables.Add(t);
        if(b["code"]!=null || !id.HasValue)t.Code=Text(b,"code",20).ToUpperInvariant();
        if(b["capacity"]!=null || !id.HasValue)t.Capacity=(short)Number(b,"capacity",1,30);
        t.IsActive=Flag(b,"isActive",t.IsActive);Audit("TABLE_SAVED","TABLE",t.Id,null,new {t.Code,t.Capacity,t.IsActive});return new {t.Id,t.Code,t.Capacity,t.IsActive,t.Version};
    },false);
    public async Task<IResult> QrRotate(Guid id,JsonObject b)=>await Command(b,async()=>
    {
        Require("MANAGER","ADMIN");var t=await Lock<RestaurantTable>("restaurant_tables",id);CheckVersion(t,b);var raw=Token();t.QrTokenHash=Hash(raw);t.QrTokenCiphertext=qrProtector.Protect(Encoding.UTF8.GetBytes(raw));t.Touch();
        Audit("QR_ROTATED","TABLE",t.Id,null,new {t.Version});return QrInfo(t,raw);
    });
    private object QrInfo(RestaurantTable t,string raw)
    {
        var origin=(config["PublicOrigin"]??"http://localhost:3000").TrimEnd('/');var path=$"/qr/{raw}";
        return new {t.Id,t.Code,t.Version,qrToken=raw,qrPath=path,qrUrl=origin+path};
    }
    public async Task<object> TableQr(Guid id)
    {
        Require("WAITER","MANAGER","ADMIN");var t=await db.RestaurantTables.AsNoTracking().SingleOrDefaultAsync(t=>t.Id==id)??throw new ApiException(404,"RESOURCE_NOT_FOUND","Không tìm thấy bàn.");
        Rules.Require(t.QrTokenCiphertext!=null,"QR_NOT_INITIALIZED","QR chưa được khởi tạo. Hãy chạy migration/seed trước.");
        return QrInfo(t,Encoding.UTF8.GetString(qrProtector.Unprotect(t.QrTokenCiphertext!)));
    }
    public async Task<object> QrRead(string token)
    {
        var h=Hash(token);var t=await db.RestaurantTables.AsNoTracking().SingleOrDefaultAsync(t=>t.QrTokenHash==h&&t.IsActive);
        Rules.Require(t!=null,"RESOURCE_NOT_FOUND","Mã bàn không hợp lệ.",404);
        var v=await db.Visits.AsNoTracking().SingleOrDefaultAsync(v=>v.TableId==t!.Id&&v.Status=="OPEN");
        var now=DateTimeOffset.UtcNow;
        var hasActiveGuestSession=v!=null&&await db.GuestSessions.AsNoTracking().AnyAsync(s=>s.VisitId==v.Id&&s.RevokedAt==null&&s.ExpiresAt>now);
        return new {tableCode=t!.Code,hasOpenVisit=v!=null,hasActiveGuestSession};
    }
    public async Task<IResult> UnlockGuestQr(Guid id,JsonObject b)=>await Command(b,async()=>
    {
        Require("WAITER","MANAGER","ADMIN");
        var t=await Lock<RestaurantTable>("restaurant_tables",id);
        var v=await db.Visits.SingleOrDefaultAsync(v=>v.TableId==t.Id&&v.Status=="OPEN");
        Rules.Require(v!=null,"TABLE_NOT_OPEN","Bàn chưa có lượt khách đang mở.");
        await Lock<Visit>("visits",v!.Id);
        var now=DateTimeOffset.UtcNow;
        var activeSessions=await db.GuestSessions.Where(s=>s.VisitId==v.Id&&s.RevokedAt==null).ToListAsync();
        foreach(var session in activeSessions) session.RevokedAt=now<session.CreatedAt?session.CreatedAt:now;
        var order=await db.Orders.SingleAsync(o=>o.VisitId==v.Id);
        Audit("GUEST_QR_UNLOCKED","VISIT",v.Id,new {activeGuestSessions=activeSessions.Count},new {activeGuestSessions=0});
        return new {visitId=v.Id,orderId=order.Id,tableCode=v.TableCodeSnapshot,revokedCount=activeSessions.Count};
    });
    public async Task<IResult> OpenVisit(Guid id,JsonObject b)=>await Command(b,async()=>
    {
        var a=Require("WAITER","MANAGER","ADMIN");var t=await Lock<RestaurantTable>("restaurant_tables",id);
        Rules.Require(t.IsActive,"TABLE_INACTIVE","Bàn đang tạm ngưng.");Rules.Require(!await db.Visits.AnyAsync(v=>v.TableId==id&&v.Status=="OPEN"),"TABLE_OCCUPIED","Bàn đang có khách.");
        var v=new Visit {TableId=id,TableCodeSnapshot=t.Code,PartySize=(short)Number(b,"partySize",1,t.Capacity),OpenedByStaffId=a.Id};
        db.Visits.Add(v);
        var o=new Order {Code="DH-"+Token()[..12].ToUpperInvariant(),VisitId=v.Id,CreatedByStaffId=a.Id};db.Orders.Add(o);
        Audit("VISIT_OPENED","VISIT",v.Id,null,new {v.TableId,v.PartySize,orderId=o.Id});
        return new {visitId=v.Id,orderId=o.Id,tableCode=t.Code,version=v.Version,orderVersion=o.Version};
    });
    public async Task<object> Join(JsonObject b)
    {
        var h=Hash(Text(b,"qrToken",128));var info=await db.RestaurantTables.AsNoTracking().SingleOrDefaultAsync(t=>t.QrTokenHash==h&&t.IsActive);
        Rules.Require(info!=null,"RESOURCE_NOT_FOUND","QR không hợp lệ hoặc bàn đang tạm ngưng.",404);
        await using var tx=await db.Database.BeginTransactionAsync();var t=await Lock<RestaurantTable>("restaurant_tables",info!.Id);
        Rules.Require(t.IsActive&&t.QrTokenHash.SequenceEqual(h),"RESOURCE_NOT_FOUND","QR đã thay đổi hoặc bàn đang tạm ngưng.",404);
        var v=await db.Visits.SingleOrDefaultAsync(v=>v.TableId==t.Id&&v.Status=="OPEN");
        Rules.Require(v!=null,"TABLE_NOT_OPEN","Bàn chưa có lượt khách đang mở. Vui lòng liên hệ nhân viên.");
        await Lock<Visit>("visits",v!.Id);var order=await db.Orders.SingleAsync(o=>o.VisitId==v.Id);
        var now=DateTimeOffset.UtcNow;
        if(Http.Request.Cookies.TryGetValue("ros_guest",out var previousToken))
        {
            var previousHash=Hash(previousToken);
            if(await db.GuestSessions.AnyAsync(s=>s.VisitId==v.Id&&s.TokenHash==previousHash&&s.RevokedAt==null&&s.ExpiresAt>now))
            {await tx.CommitAsync();return new {visitId=v.Id,orderId=order.Id,tableCode=v.TableCodeSnapshot};}
        }
        var existing=await db.GuestSessions.Where(s=>s.VisitId==v.Id&&s.RevokedAt==null).ToListAsync();
        Rules.Require(!existing.Any(s=>s.ExpiresAt>now),"TABLE_QR_CLAIMED","Bàn này đang có thực khách giữ phiên gọi món. Nếu cần quét lại, vui lòng liên hệ nhân viên để mở khóa QR.");
        foreach(var expired in existing) expired.RevokedAt=now<expired.CreatedAt?expired.CreatedAt:now;
        if(existing.Count>0) await db.SaveChangesAsync();
        var token=Token();var s=new GuestSession {VisitId=v.Id,TokenHash=Hash(token),ExpiresAt=now.AddHours(12)};db.GuestSessions.Add(s);
        await db.SaveChangesAsync();await tx.CommitAsync();Cookie("ros_guest",token,12);
        return new {visitId=v.Id,orderId=order.Id,tableCode=v.TableCodeSnapshot};
    }
    public async Task<object> GuestCurrent()
    {
        var a=Require();Rules.Require(a.IsGuest,"FORBIDDEN","Hãy dùng cookie khách và header X-Actor: guest.",403);
        var v=await db.Visits.AsNoTracking().SingleAsync(v=>v.Id==a.VisitId);var o=await db.Orders.SingleAsync(o=>o.VisitId==v.Id);
        return new {visitId=v.Id,orderId=o.Id,tableCode=v.TableCodeSnapshot};
    }
}
