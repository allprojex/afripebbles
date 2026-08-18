import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

// Pages
import Home from '@/pages/home';
import About from '@/pages/about';
import PodcastListing from '@/pages/podcast/index';
import PodcastEpisode from '@/pages/podcast/episode';
import ShopListing from '@/pages/shop/index';
import ShopProduct from '@/pages/shop/product';
import BlogListing from '@/pages/blog/index';
import BlogPost from '@/pages/blog/post';
import CuratedPicks from '@/pages/curated';
import Collaborate from '@/pages/collaborate';
import Community from '@/pages/community';
import Contact from '@/pages/contact';
import Faq from '@/pages/faq';
import Ugc from '@/pages/ugc';
import Unsubscribe from '@/pages/unsubscribe';
import Cart from '@/pages/cart';
import Checkout from '@/pages/checkout';
import OrderConfirmation from '@/pages/order-confirmation';
import TrackOrder from '@/pages/track-order';
import AdminApp from '@/admin/AdminApp';
import { CartProvider } from '@/lib/cart';

// Legal / policy pages
import PrivacyPolicyPage from '@/pages/legal/privacy';
import CookiePolicyPage from '@/pages/legal/cookies';
import TermsPage from '@/pages/legal/terms';
import ShippingPage from '@/pages/legal/shipping';
import ReturnsPage from '@/pages/legal/returns';
import PreorderPolicyPage from '@/pages/legal/preorder-policy';
import AffiliateDisclosurePage from '@/pages/legal/affiliate-disclosure';
import DigitalProductTermsPage from '@/pages/legal/digital-product-terms';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />

      <Route path="/podcast" component={PodcastListing} />
      <Route path="/podcast/:id" component={PodcastEpisode} />

      <Route path="/shop" component={ShopListing} />
      <Route path="/shop/:id" component={ShopProduct} />

      <Route path="/journal" component={BlogListing} />
      <Route path="/journal/:slug" component={BlogPost} />

      <Route path="/recommendations" component={CuratedPicks} />
      <Route path="/collaborate" component={Collaborate} />
      <Route path="/community" component={Community} />
      <Route path="/contact" component={Contact} />
      <Route path="/faq" component={Faq} />
      <Route path="/ugc" component={Ugc} />
      <Route path="/unsubscribe" component={Unsubscribe} />

      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/order-confirmation" component={OrderConfirmation} />
      <Route path="/track-order" component={TrackOrder} />

      <Route path="/privacy" component={PrivacyPolicyPage} />
      <Route path="/cookies" component={CookiePolicyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/shipping" component={ShippingPage} />
      <Route path="/returns" component={ReturnsPage} />
      <Route path="/preorder-policy" component={PreorderPolicyPage} />
      <Route path="/affiliate-disclosure" component={AffiliateDisclosurePage} />
      <Route path="/digital-product-terms" component={DigitalProductTermsPage} />

      <Route path="/admin" component={AdminApp} />
      <Route path="/admin/*" component={AdminApp} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
