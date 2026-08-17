import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, Controller } from "react-hook-form";
import { useSubscribeNewsletter, useGetSiteSettings } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Instagram, Facebook, Youtube, ArrowRight } from "lucide-react";
import { siteConfig } from "@/content/site";
import { resolveSiteSettings } from "@/lib/settings";

interface FooterNewsletterForm {
  email: string;
  consent: boolean;
}

const SOCIAL_ICONS: Record<string, typeof Instagram> = {
  Instagram: Instagram,
  Facebook: Facebook,
  YouTube: Youtube,
  // TikTok has no icon in lucide-react's stable set; fall back to a text glyph in render.
};

export default function Footer() {
  const { toast } = useToast();
  const { register, control, handleSubmit, reset, formState } = useForm<FooterNewsletterForm>({
    defaultValues: { email: "", consent: false },
  });
  const subscribeMutation = useSubscribeNewsletter();
  const { data: siteSettings } = useGetSiteSettings();
  const resolved = resolveSiteSettings(siteSettings);
  const socialLinks = resolved.socialLinks;

  const onSubmit = (data: FooterNewsletterForm) => {
    subscribeMutation.mutate(
      { data: { email: data.email, consent: data.consent } },
      {
        onSuccess: () => {
          toast({
            title: "Welcome to the community!",
            description: "You've successfully subscribed to our newsletter.",
          });
          reset();
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Something went wrong.",
            description: "Please try again later.",
          });
        },
      }
    );
  };

  return (
    <footer className="bg-muted/30 pt-20 pb-10 border-t border-border mt-auto">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-5 space-y-6">
            <Link href="/" className="inline-block">
              <span className="font-serif text-3xl tracking-tight font-medium text-foreground">
                {resolved.brandName}
              </span>
            </Link>
            <p className="text-foreground/70 max-w-sm leading-relaxed text-sm md:text-base">
              {siteConfig.brand.oneLineDescription}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-4">
                {socialLinks.map((social) => {
                  const Icon = SOCIAL_ICONS[social.label];
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`AfriPebbles on ${social.label}`}
                      className="p-2 rounded-full bg-background border border-border text-foreground/70 hover:text-primary hover:border-primary transition-colors"
                    >
                      {Icon ? (
                        <Icon size={18} />
                      ) : (
                        <span className="w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold">
                          {social.label.slice(0, 2)}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div className="md:col-span-3 space-y-6">
            <h4 className="font-serif text-xl">Explore</h4>
            <ul className="space-y-3">
              {siteConfig.nav.footerExplore.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-foreground/70 hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4 space-y-6">
            <h4 className="font-serif text-xl">The Newsletter</h4>
            <p className="text-foreground/70 text-sm">
              Receive gentle encouragement, curated picks, and updates straight to your inbox.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2" noValidate>
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Email address
              </label>
              <Input
                id="footer-newsletter-email"
                {...register("email", { required: true })}
                type="email"
                placeholder="Your email address"
                className="bg-background border-border"
                disabled={subscribeMutation.isPending}
                aria-invalid={formState.errors.email ? "true" : "false"}
              />
              <Button
                type="submit"
                disabled={subscribeMutation.isPending}
                className="shrink-0 px-3"
                aria-label="Subscribe to the newsletter"
              >
                <ArrowRight size={18} />
              </Button>
            </form>
            <label className="flex items-start gap-2 text-xs text-foreground/50">
              <Controller
                control={control}
                name="consent"
                rules={{ required: true }}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    aria-invalid={formState.errors.consent ? "true" : "false"}
                    className="mt-0.5"
                  />
                )}
              />
              <span>
                I agree to receive emails from AfriPebbles. See our{" "}
                <Link href="/privacy" className="underline hover:text-primary">
                  Privacy Policy
                </Link>
                . Unsubscribe anytime.
              </span>
            </label>
          </div>
        </div>

        {resolved.footerText && <p className="text-center text-sm text-foreground/50 pt-8 border-t border-border">{resolved.footerText}</p>}
        <div className={`${resolved.footerText ? "pt-6" : "pt-8 border-t border-border"} flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-foreground/50`}>
          <p>
            © {new Date().getFullYear()} {resolved.brandName}. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Terms & Conditions
            </Link>
            <Link href="/faq" className="hover:text-primary transition-colors">
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
