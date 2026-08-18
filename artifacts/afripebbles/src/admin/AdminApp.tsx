import type { ComponentType } from "react";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { RequireAdmin } from "./components/RequireAdmin";
import { AdminLayout } from "./components/AdminLayout";

import AdminLogin from "./pages/auth/Login";
import AdminForgotPassword from "./pages/auth/ForgotPassword";
import AdminResetPassword from "./pages/auth/ResetPassword";

import AdminDashboard from "./pages/Dashboard";
import AdminProductsList from "./pages/products/List";
import AdminProductEdit from "./pages/products/Edit";
import AdminProductPreview from "./pages/products/Preview";
import AdminUgcList from "./pages/ugc/List";
import AdminUgcEdit from "./pages/ugc/Edit";
import AdminTestimonialsList from "./pages/testimonials/List";
import AdminTestimonialEdit from "./pages/testimonials/Edit";
import AdminRecommendationsList from "./pages/recommendations/List";
import AdminRecommendationEdit from "./pages/recommendations/Edit";
import AdminPodcastList from "./pages/podcast/List";
import AdminPodcastEdit from "./pages/podcast/Edit";
import AdminArticlesList from "./pages/articles/List";
import AdminArticleEdit from "./pages/articles/Edit";
import AdminHomepage from "./pages/Homepage";
import AdminSiteSettings from "./pages/SiteSettings";
import AdminEnquiries from "./pages/Enquiries";
import AdminNewsletter from "./pages/Newsletter";
import AdminOrdersList from "./pages/orders/List";
import AdminOrderDetail from "./pages/orders/Detail";
import AdminCouponsList from "./pages/coupons/List";
import AdminCouponEdit from "./pages/coupons/Edit";

function Protected({ component: Component }: { component: ComponentType }) {
  return (
    <RequireAdmin>
      <AdminLayout>
        <Component />
      </AdminLayout>
    </RequireAdmin>
  );
}

function NotFoundAdmin() {
  return <p className="text-foreground/60">Page not found.</p>;
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <WouterRouter base="/admin">
        <Switch>
          <Route path="/login" component={AdminLogin} />
          <Route path="/forgot-password" component={AdminForgotPassword} />
          <Route path="/reset-password" component={AdminResetPassword} />

          <Route path="/" component={() => <Protected component={AdminDashboard} />} />

          <Route path="/products" component={() => <Protected component={AdminProductsList} />} />
          <Route path="/products/:id/preview" component={() => <RequireAdmin><AdminProductPreview /></RequireAdmin>} />
          <Route path="/products/:id" component={() => <Protected component={AdminProductEdit} />} />

          <Route path="/ugc" component={() => <Protected component={AdminUgcList} />} />
          <Route path="/ugc/:id" component={() => <Protected component={AdminUgcEdit} />} />

          <Route path="/testimonials" component={() => <Protected component={AdminTestimonialsList} />} />
          <Route path="/testimonials/:id" component={() => <Protected component={AdminTestimonialEdit} />} />

          <Route path="/recommendations" component={() => <Protected component={AdminRecommendationsList} />} />
          <Route path="/recommendations/:id" component={() => <Protected component={AdminRecommendationEdit} />} />

          <Route path="/podcast" component={() => <Protected component={AdminPodcastList} />} />
          <Route path="/podcast/:id" component={() => <Protected component={AdminPodcastEdit} />} />

          <Route path="/articles" component={() => <Protected component={AdminArticlesList} />} />
          <Route path="/articles/:id" component={() => <Protected component={AdminArticleEdit} />} />

          <Route path="/homepage" component={() => <Protected component={AdminHomepage} />} />
          <Route path="/settings" component={() => <Protected component={AdminSiteSettings} />} />
          <Route path="/enquiries" component={() => <Protected component={AdminEnquiries} />} />
          <Route path="/newsletter" component={() => <Protected component={AdminNewsletter} />} />

          <Route path="/orders" component={() => <Protected component={AdminOrdersList} />} />
          <Route path="/orders/:id" component={() => <Protected component={AdminOrderDetail} />} />

          <Route path="/coupons" component={() => <Protected component={AdminCouponsList} />} />
          <Route path="/coupons/:id" component={() => <Protected component={AdminCouponEdit} />} />

          <Route component={() => <Protected component={NotFoundAdmin} />} />
        </Switch>
      </WouterRouter>
    </AdminAuthProvider>
  );
}
