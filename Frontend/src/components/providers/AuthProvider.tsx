"use client";
import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { api, ApiError, key } from "@/lib/api";
import { navs, resolveInitialTabFromPath } from "@/config/navigation";
import { getDefaultTabForUser, hasRole } from "@/config/roles";
import { GUEST_POLL_INTERVAL_MS, STAFF_POLL_INTERVAL_MS } from "@/config/polling";
import { usePolling } from "@/hooks/usePolling";
import { useToast } from "./ToastProvider";
import type { FormConfig, FormField, PendingRequest } from "@/types/api";
import type { User } from "@/types/auth";
import type { MenuData, MenuItem } from "@/types/menu";
import type { CartItem, Order } from "@/types/order";
import type { Receipt } from "@/types/payment";
import type { Table, TableQr, TableQrPublicInfo } from "@/types/table";

export type AuthContextValue = {
  user: User | null;
  setUser: (u: User | null) => void;
  loaded: boolean;
  guest: boolean;
  setGuest: (g: boolean) => void;
  tab: string;
  setTab: (t: string) => void;
  menu: MenuData;
  setMenu: (m: MenuData) => void;
  data: any[];
  setData: (d: any[]) => void;
  order: Order | null;
  setOrder: (o: Order | null) => void;
  orderId: string | null;
  setOrderId: (id: string | null) => void;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  category: string;
  setCategory: (c: string) => void;
  search: string;
  setSearch: (s: string) => void;
  busy: boolean;
  error: string;
  setError: (e: string) => void;
  notice: string;
  setNotice: (n: string) => void;
  connected: boolean;
  form: FormConfig | null;
  setForm: (f: FormConfig | null) => void;
  qrToken: string;
  setQrToken: (t: string) => void;
  qrInfo: TableQrPublicInfo | null;
  receipt: Receipt | null;
  setReceipt: (r: Receipt | null) => void;
  history: string;
  setHistory: (h: string) => void;
  tableQr: TableQr | null;
  setTableQr: (q: TableQr | null) => void;
  paymentHistoryRefresh: number;
  setPaymentHistoryRefresh: React.Dispatch<React.SetStateAction<number>>;
  pending: PendingRequest | null;
  has: (...roles: string[]) => boolean;
  notify: (text: string) => void;
  refresh: () => Promise<void>;
  mutate: (path: string, body?: any, method?: string) => Promise<any>;
  run: (fn: () => Promise<void>) => Promise<void>;
  ask: (
    title: string,
    fields: FormField[],
    submit: FormConfig["submit"],
    description?: string,
  ) => void;
  login: (e: FormEvent<HTMLFormElement>) => void;
  joinByTokenOrUrl: (supplied: string) => void;
  logout: () => void;
  selectOrder: (id: string) => void;
  startNewTakeaway: () => void;
  addToCart: (item: { id: string; name?: string; priceVnd?: number }) => void;
  sendCart: () => void;
  itemCommand: (item: { id: string; version: number }, action: string, reason?: string) => void;
  openTable: (table: Table) => void;
  payForm: (o: Order) => void;
  editMenu: (m?: MenuItem) => void;
  retryPending: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { notice, setNotice, notify } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [guest, setGuest] = useState(false);
  const [tab, setTab] = useState("tables");
  const [menu, setMenu] = useState<MenuData>({ items: [], categories: [] });
  const [data, setData] = useState<any[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(true);
  const [form, setForm] = useState<FormConfig | null>(null);
  const [qrToken, setQrToken] = useState("");
  const [qrInfo, setQrInfo] = useState<TableQrPublicInfo | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [history, setHistory] = useState("");
  const [tableQr, setTableQr] = useState<TableQr | null>(null);
  const [paymentHistoryRefresh, setPaymentHistoryRefresh] = useState(0);
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const keys = useRef(new Map<string, string>());

  const has = useCallback(
    (...roles: string[]) => hasRole(user, ...roles),
    [user],
  );

  useEffect(() => {
    let active = true;
    const boot = async () => {
      const pathname = window.location.pathname;
      const isGuest = pathname.startsWith("/qr/") || pathname.startsWith("/customer");
      setGuest(isGuest);
      const m = await api("/menu");
      if (!active) return;
      setMenu(m);

      if (pathname.startsWith("/qr/")) {
        const token = pathname.split("/")[2];
        setQrToken(window.location.origin + "/qr/" + token);
        const info = await api("/qr/" + encodeURIComponent(token));
        if (!active) return;
        setQrInfo(info);
        const current = await api("/guest/join", {
          method: "POST",
          guest: true,
          body: { qrToken: token },
        });
        const me = await api("/auth/me", { guest: true });
        if (!active) return;
        setUser(me);
        setOrderId(current.orderId);
        setTab("menu");
        return;
      }

      const me = await api("/auth/me", { guest: isGuest }).catch(() => null);
      if (!active) return;
      setUser(me);
      if (me?.isGuest) {
        const current = await api("/guest/current", { guest: true });
        if (active) {
          setOrderId(current.orderId);
          setTab("menu");
        }
      } else if (me) {
        const initial = resolveInitialTabFromPath(pathname);
        const allowed = navs.filter((n) => n.roles.some((r) => me.roles.includes(r)));
        setTab(allowed.some((n) => n.id === initial) ? initial : allowed[0]?.id ?? "menu");
      }
    };

    boot()
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Đã xảy ra lỗi.");
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const opts = { guest };
    const requests: Promise<void>[] = [];
    if (orderId) {
      requests.push(api("/orders/" + orderId, opts).then(setOrder));
    }
    if (user && !user.isGuest) {
      const endpoint: Record<string, string> = {
        tables: "/tables",
        orders: "/orders" + (history ? "?status=" + history : ""),
        kitchen: "/kitchen/items",
        approvals: "/approval-batches",
        serving: "/serving/items",
        billing: "/checkout/orders",
        staff: "/staff",
      };
      if (endpoint[tab]) {
        requests.push(api(endpoint[tab]).then((d) => setData(d.items)));
      }
    }
    if (tab === "menu" || tab === "kitchen") {
      requests.push(
        api(hasRole(user, "MANAGER", "ADMIN") && !guest ? "/manage/menu-items" : "/menu", opts).then(
          setMenu,
        ),
      );
    }
    await Promise.all(requests);
    setConnected(true);
  }, [orderId, tab, user, guest, history]);

  const handlePollError = useCallback(
    (e: unknown) => {
      setConnected(false);
      if (guest && e instanceof ApiError && e.status === 401) {
        setUser(null);
        setOrderId(null);
        setOrder(null);
        setCart([]);
        setError("Lượt khách đã kết thúc. Quét lại QR của bàn khi nhân viên mở lượt mới.");
      }
    },
    [guest],
  );

  usePolling(
    Boolean(user && tab !== "payment-history"),
    guest ? GUEST_POLL_INTERVAL_MS : STAFF_POLL_INTERVAL_MS,
    refresh,
    handlePollError,
  );

  const mutate = useCallback(
    async (path: string, body: any = {}, method = "POST") => {
      if (pending) {
        throw new Error("Yêu cầu trước chưa rõ kết quả. Hãy kiểm tra hoặc gửi lại yêu cầu đó trước.");
      }
      const signature = method + path + JSON.stringify(body);
      let requestKey = keys.current.get(signature);
      if (!requestKey) {
        requestKey = key();
        keys.current.set(signature, requestKey);
      }
      try {
        const result = await api(path, { body, method, guest, key: requestKey });
        keys.current.delete(signature);
        return result;
      } catch (e) {
        if (e instanceof ApiError) {
          keys.current.delete(signature);
        } else {
          setPending({ path, body, method, key: requestKey, guest });
        }
        throw e;
      }
    },
    [pending, guest],
  );

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      setError("");
      try {
        await fn();
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Đã xảy ra lỗi.");
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const ask = useCallback(
    (
      title: string,
      fields: FormField[],
      submit: FormConfig["submit"],
      description?: string,
    ) => {
      setForm({ title, fields, submit, description });
    },
    [],
  );

  const login = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const values = Object.fromEntries(new FormData(e.currentTarget));
      run(async () => {
        await api("/auth/login", { method: "POST", body: values });
        const me = await api("/auth/me");
        setGuest(false);
        setUser(me);
        setTab(getDefaultTabForUser(me));
        notify("Đăng nhập thành công.");
      });
    },
    [run, notify],
  );

  const joinByTokenOrUrl = useCallback(
    (suppliedInput: string) => {
      run(async () => {
        const supplied = suppliedInput.trim();
        const token = /^[a-f0-9]{64}$/.test(supplied)
          ? supplied
          : new URL(supplied, window.location.origin).pathname.split("/")[2];
        if (!token) throw new Error("Liên kết bàn không hợp lệ.");
        const r = await api("/guest/join", {
          method: "POST",
          guest: true,
          body: { qrToken: token },
        });
        setUser(await api("/auth/me", { guest: true }));
        setOrderId(r.orderId);
        setTab("menu");
      });
    },
    [run],
  );

  const logout = useCallback(() => {
    run(async () => {
      await api("/auth/logout", { method: "POST", guest });
      setUser(null);
      setOrderId(null);
      setOrder(null);
      setCart([]);
      setData([]);
    });
  }, [run, guest]);

  const selectOrder = useCallback((id: string) => {
    setOrderId(id);
    setOrder(null);
    setReceipt(null);
    setCart([]);
    setTab("menu");
  }, []);

  const startNewTakeaway = useCallback(() => {
    setOrderId(null);
    setOrder(null);
    setCart([]);
    setTab("menu");
    notify("Chọn món để tạo đơn mang về mới.");
  }, [notify]);

  const addToCart = useCallback(
    (item: { id: string; name?: string; priceVnd?: number }) => {
      setCart((old) => {
        const found = old.find((x) => x.menuItemId === item.id);
        return found
          ? old.map((x) =>
              x.menuItemId === item.id
                ? { ...x, quantity: Math.min(x.quantity + 1, 99) }
                : x,
            )
          : [
              ...old,
              {
                menuItemId: item.id,
                name: item.name ?? "",
                quantity: 1,
                observedPriceVnd: item.priceVnd ?? 0,
                note: "",
              },
            ];
      });
    },
    [],
  );

  const sendCart = useCallback(() => {
    run(async () => {
      const items = cart.map(({ menuItemId, quantity, observedPriceVnd, note }) => ({
        menuItemId,
        quantity,
        observedPriceVnd,
        note: note || null,
      }));
      const result = orderId
        ? await mutate(`/orders/${orderId}/batches`, {
            expectedOrderVersion: order?.version,
            items,
          })
        : await mutate("/takeaway-orders", { pickupName: null, items });
      setOrderId(result.orderId);
      setCart([]);
      notify(
        result.status === "PENDING"
          ? "Đợt gọi thêm đã gửi, đang chờ phê duyệt."
          : "Đã chuyển món xuống bếp.",
      );
    });
  }, [run, cart, orderId, order, mutate, notify]);

  const itemCommand = useCallback(
    (item: { id: string; version: number }, action: string, reason?: string) => {
      run(async () => {
        await mutate(`/order-items/${item.id}/${action}`, {
          expectedVersion: item.version,
          ...(reason ? { reason } : {}),
        });
        notify("Đã cập nhật món.");
      });
    },
    [run, mutate, notify],
  );

  const openTable = useCallback(
    (table: Table) => {
      ask(
        "Mở lượt khách · " + table.code,
        [{ name: "partySize", label: "Số khách", type: "number", value: 2 }],
        async (v) => {
          const r = await mutate(`/tables/${table.id}/visits`, {
            partySize: Number(v.partySize),
          });
          setOrderId(r.orderId);
          setTab("menu");
          notify(
            `Đã mở lượt bàn ${table.code}. Khách quét QR cố định của bàn là vào, không cần nhập mã.`,
          );
        },
      );
    },
    [ask, mutate, notify],
  );

  const payForm = useCallback(
    (o: Order) => {
      ask(
        "Xác nhận đã nhận tiền",
        [
          {
            name: "method",
            label: "Phương thức",
            type: "select",
            options: o.totalVnd === 0 ? ["ZERO"] : ["CASH", "BANK_TRANSFER"],
          },
          {
            name: "tenderedVnd",
            label: "Tiền khách đưa (tiền mặt)",
            type: "number",
            value: o.totalVnd ?? 0,
            required: false,
          },
          {
            name: "transferReference",
            label: "Mã/nội dung giao dịch (chuyển khoản)",
            required: false,
          },
        ],
        async (v) => {
          const result = await mutate(`/orders/${o.id}/payments`, {
            expectedVersion: o.version,
            method: v.method,
            amountVnd: o.totalVnd,
            tenderedVnd: v.method === "CASH" ? Number(v.tenderedVnd) : null,
            transferReference:
              v.method === "BANK_TRANSFER" ? v.transferReference : null,
          });
          setReceipt(await api(`/orders/${o.id}/receipt`));
          setOrderId(null);
          setOrder(null);
          notify("Thanh toán thành công · " + result.receiptNo);
        },
        "Chỉ xác nhận sau khi đã nhận đủ tiền. Chuyển khoản được đối chiếu thủ công.",
      );
    },
    [ask, mutate, notify],
  );

  const editMenu = useCallback(
    (m?: MenuItem) => {
      ask(
        m ? "Chỉnh sửa món ăn" : "Thêm món mới",
        [
          { name: "code", label: "Mã món", value: m?.code ?? "MON-021" },
          { name: "name", label: "Tên món", value: m?.name ?? "Lẩu nấm chay" },
          {
            name: "categoryId",
            label: "Danh mục",
            type: "select",
            options: menu.categories.map((c) => c.id),
            value: m?.categoryId ?? menu.categories[0]?.id,
          },
          {
            name: "priceVnd",
            label: "Giá bán (VND)",
            type: "number",
            value: m?.priceVnd ?? 159000,
          },
          {
            name: "description",
            label: "Mô tả",
            value:
              m?.description ??
              "Nấm tươi, rau theo mùa và nước dùng thanh ngọt.",
          },
          {
            name: "imageUrl",
            label: "Đường dẫn ảnh",
            value: m?.imageUrl ?? "/menu/placeholder.svg",
          },
        ],
        async (v) => {
          await mutate(
            m ? `/menu-items/${m.id}` : "/menu-items",
            {
              ...v,
              priceVnd: Number(v.priceVnd),
              ...(m ? { expectedVersion: m.version } : {}),
            },
            m ? "PATCH" : "POST",
          );
          notify("Đã lưu món ăn.");
        },
      );
    },
    [ask, menu.categories, mutate, notify],
  );

  const retryPending = useCallback(() => {
    if (!pending) return;
    run(async () => {
      await api(pending.path, {
        body: pending.body,
        method: pending.method,
        key: pending.key,
        guest: pending.guest,
      });
      keys.current.clear();
      setPending(null);
      setCart([]);
      notify("Đã xác nhận kết quả yêu cầu cũ. Hãy mở lại đơn để kiểm tra.");
    });
  }, [pending, run, notify]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loaded,
        guest,
        setGuest,
        tab,
        setTab,
        menu,
        setMenu,
        data,
        setData,
        order,
        setOrder,
        orderId,
        setOrderId,
        cart,
        setCart,
        category,
        setCategory,
        search,
        setSearch,
        busy,
        error,
        setError,
        notice,
        setNotice,
        connected,
        form,
        setForm,
        qrToken,
        setQrToken,
        qrInfo,
        receipt,
        setReceipt,
        history,
        setHistory,
        tableQr,
        setTableQr,
        paymentHistoryRefresh,
        setPaymentHistoryRefresh,
        pending,
        has,
        notify,
        refresh,
        mutate,
        run,
        ask,
        login,
        joinByTokenOrUrl,
        logout,
        selectOrder,
        startNewTakeaway,
        addToCart,
        sendCart,
        itemCommand,
        openTable,
        payForm,
        editMenu,
        retryPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

