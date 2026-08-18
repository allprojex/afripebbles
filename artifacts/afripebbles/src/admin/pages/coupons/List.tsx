import { Link } from "wouter";
import { Plus } from "lucide-react";
import { useAdminListCoupons } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminCouponsList() {
  const { data: coupons, isLoading } = useAdminListCoupons();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif mb-1">Coupons</h1>
          <p className="text-foreground/60">Discount codes for checkout.</p>
        </div>
        <Link href="/coupons/new">
          <Button className="gap-2">
            <Plus size={16} /> New coupon
          </Button>
        </Link>
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-foreground/50 text-sm">Loading…</p>
        ) : !coupons || coupons.length === 0 ? (
          <p className="p-12 text-center text-foreground/60">No coupons yet — add the first one.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id} className="cursor-pointer">
                  <TableCell className="font-mono">
                    <Link href={`/coupons/${coupon.id}`} className="hover:underline">
                      {coupon.code}
                    </Link>
                  </TableCell>
                  <TableCell>{coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `${coupon.discountValue} ${coupon.currency ?? ""}`}</TableCell>
                  <TableCell>
                    {coupon.usageCount}
                    {coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={coupon.isActive ? "default" : "outline"}>{coupon.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
