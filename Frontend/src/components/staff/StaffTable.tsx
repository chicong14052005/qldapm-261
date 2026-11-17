"use client";
import { roleNames } from "@/config/roles";
import { useAuth } from "@/hooks/useAuth";
import type { StaffMember } from "@/types/auth";
import {
  buildChangeRolesFields,
  buildCreateStaffFields,
  buildResetPasswordFields,
} from "./StaffFormModal";

export default function StaffTable() {
  const { data, ask, mutate, run } = useAuth();
  const staffList = data as StaffMember[];

  return (
    <>
      <div className="section-bar">
        <h2>Đội ngũ nhà hàng</h2>
        <button
          className="primary"
          onClick={() =>
            ask("Thêm nhân viên", buildCreateStaffFields(), async (v) => {
              await mutate("/staff", {
                username: v.username,
                displayName: v.displayName,
                initialPassword: v.initialPassword,
                roles: [v.role],
              });
            })
          }
        >
          ＋ Thêm nhân viên
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.displayName}</strong>
                  <small>{u.username}</small>
                </td>
                <td>{u.roles.map((r) => roleNames[r]).join(", ")}</td>
                <td>
                  <span className={`badge ${u.isActive ? "free" : "cancelled"}`}>
                    {u.isActive ? "Hoạt động" : "Đã khóa"}
                  </span>
                </td>
                <td>
                  <div className="card-links">
                    <button
                      className="text-btn"
                      onClick={() =>
                        ask(
                          "Đổi vai trò",
                          buildChangeRolesFields(u),
                          async (v) => {
                            await mutate(
                              `/staff/${u.id}/roles`,
                              {
                                roles: v.roles
                                  .split(",")
                                  .map((x) => x.trim().toUpperCase()),
                                expectedVersion: u.version,
                              },
                              "PUT",
                            );
                          },
                        )
                      }
                    >
                      Phân quyền
                    </button>
                    <button
                      className="text-btn"
                      onClick={() =>
                        run(async () => {
                          await mutate(
                            `/staff/${u.id}`,
                            {
                              active: !u.isActive,
                              expectedVersion: u.version,
                            },
                            "PATCH",
                          );
                        })
                      }
                    >
                      {u.isActive ? "Khóa" : "Mở khóa"}
                    </button>
                    <button
                      className="text-btn"
                      onClick={() =>
                        ask(
                          "Đặt lại mật khẩu",
                          buildResetPasswordFields(),
                          async (v) => {
                            await mutate(`/staff/${u.id}/reset-password`, {
                              ...v,
                              expectedVersion: u.version,
                            });
                          },
                        )
                      }
                    >
                      Đặt lại MK
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

