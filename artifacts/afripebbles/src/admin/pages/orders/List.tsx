import { useState } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { useAdminListOrders, type PaymentStatus, type OrderStatus } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "../../components/StatusBadge";
import { formatCurrency } from "@/lib/currency";

export default function AdminOrdersList() {
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "all">("all");
  const [orderStatus, setOrderStatus] = useState<OrderStatus | "all">("all");
  const [country, setCountry] = useState("");

  const { data, isLoading } = useAdminListOrders({
    search: search || undefined,
    paymentStatus: paymentStatus === "all" ? undefined : paymentStatus,
    orderStatus: orderStatus === "all" ? undefined : orderStatus,
    country: country || undefined,
    limit: 100,
  });

  const orders = data?.orders ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif mb-1">Orders</h1>
        <p className="text-foreground/60">{data ? `${data.total} order${data.total === 1 ? "" : "s"}` : "Loading…"}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
          <Input placeholder="Search reference, email, or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} className="sm:w-40" />
        <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as PaymentStatus | "all")}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payment statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={orderStatus} onValueChange={(v) => setOrderStatus(v as OrderStatus | "all")}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All order statuses</SelectItem>
            <SelectItem value="pending_payment">Pending Payment</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-foreground/50 text-sm">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="p-12 text-center text-foreground/60">No orders match your filters.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer">
                  <TableCell className="font-mono text-sm">
                    <Link href={`/orders/${order.id}`} className="hover:underline">
                      {order.orderReference}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>{order.customerName}</div>
                    <div className="text-xs text-foreground/50">{order.customerEmail}</div>
                  </TableCell>
                  <TableCell>{order.country}</TableCell>
                  <TableCell>
                    <StatusBadge status={order.paymentStatus} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.orderStatus} />
                  </TableCell>
                  <TableCell>{formatCurrency(order.grandTotal, order.currency)}</TableCell>
                  <TableCell className="text-foreground/50 text-sm">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
