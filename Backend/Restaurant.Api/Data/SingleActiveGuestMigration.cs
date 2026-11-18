using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
namespace Restaurant.Api.Data;

[DbContext(typeof(AppDb))]
[Migration("202611180005_SingleActiveGuestPerVisit")]
public class SingleActiveGuestMigration : Migration
{
    protected override void Up(MigrationBuilder m) => m.Sql("""
        WITH ranked AS (
          SELECT id, row_number() OVER (PARTITION BY visit_id ORDER BY created_at DESC, id DESC) AS rn
          FROM guest_sessions
          WHERE revoked_at IS NULL
        )
        UPDATE guest_sessions gs
        SET revoked_at = GREATEST(now(), gs.created_at)
        FROM ranked r
        WHERE gs.id = r.id AND r.rn > 1;

        DROP INDEX IF EXISTS ux_guest_sessions_active_visit;
        CREATE UNIQUE INDEX ux_guest_sessions_active_visit ON guest_sessions(visit_id) WHERE revoked_at IS NULL;
        """);
    protected override void Down(MigrationBuilder m) => throw new NotSupportedException("Use a forward migration or restore backup.");
}

