import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAdminGetSiteSettings, useAdminUpdateSiteSettings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "../components/ImageUploader";
import { TagsInput } from "../components/TagsInput";

interface FormValues {
  brandName: string | null;
  tagline: string | null;
  contactEmail: string | null;
  supportEmail: string | null;
  collaborationEmail: string | null;
  whatsappNumber: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  seoDefaultTitle: string | null;
  seoDefaultDescription: string | null;
  canonicalUrl: string | null;
  socialShareImageUrl: string | null;
  businessCountry: string | null;
  supportedRegions: string[];
  defaultCurrency: string | null;
  newsletterWording: string | null;
  footerText: string | null;
  podcastLaunchStatus: string | null;
  shopStatus: string | null;
  preorderNotice: string | null;
  shippingNotice: string | null;
  affiliateDisclosure: string | null;
  privacyContactInfo: string | null;
}

const DEFAULT_VALUES: FormValues = {
  brandName: null,
  tagline: null,
  contactEmail: null,
  supportEmail: null,
  collaborationEmail: null,
  whatsappNumber: null,
  instagramUrl: null,
  facebookUrl: null,
  youtubeUrl: null,
  tiktokUrl: null,
  seoDefaultTitle: null,
  seoDefaultDescription: null,
  canonicalUrl: null,
  socialShareImageUrl: null,
  businessCountry: null,
  supportedRegions: [],
  defaultCurrency: null,
  newsletterWording: null,
  footerText: null,
  podcastLaunchStatus: null,
  shopStatus: null,
  preorderNotice: null,
  shippingNotice: null,
  affiliateDisclosure: null,
  privacyContactInfo: null,
};

function TextField({ control, name, label, placeholder }: { control: any; name: keyof FormValues; label: string; placeholder?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} {...field} value={(field.value as string) ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

export default function AdminSiteSettings() {
  const { data, isLoading } = useAdminGetSiteSettings();
  const updateMutation = useAdminUpdateSiteSettings();
  const { toast } = useToast();

  const form = useForm<FormValues>({ defaultValues: DEFAULT_VALUES });

  useEffect(() => {
    if (data) form.reset(data);
  }, [data, form]);

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(
      { data: values },
      {
        onSuccess: () => toast({ title: "Site settings saved" }),
        onError: (err) => toast({ variant: "destructive", title: "Couldn't save", description: err instanceof Error ? err.message : undefined }),
      },
    );
  };

  if (isLoading) return <p className="text-foreground/50 text-sm">Loading…</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-serif mb-1">Site settings</h1>
        <p className="text-foreground/60">
          Only confirmed values are published. Social icons stay hidden on the public site until a URL is saved here.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10" noValidate>
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Brand</h2>
            <TextField control={form.control} name="brandName" label="Brand name" placeholder="AfriPebbles" />
            <TextField control={form.control} name="tagline" label="Tagline" />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Contact</h2>
            <TextField control={form.control} name="contactEmail" label="Contact email" />
            <TextField control={form.control} name="supportEmail" label="Customer-support email" />
            <TextField control={form.control} name="collaborationEmail" label="Collaboration email" />
            <TextField control={form.control} name="whatsappNumber" label="WhatsApp number" />
            <FormField
              control={form.control}
              name="privacyContactInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Privacy contact information</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                  <FormDescription>Shown on the Privacy Policy page.</FormDescription>
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Social links</h2>
            <p className="text-sm text-foreground/50">A social icon only appears publicly once its URL is set here.</p>
            <TextField control={form.control} name="instagramUrl" label="Instagram URL" />
            <TextField control={form.control} name="facebookUrl" label="Facebook URL" />
            <TextField control={form.control} name="youtubeUrl" label="YouTube URL" />
            <TextField control={form.control} name="tiktokUrl" label="TikTok URL" />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">SEO &amp; sharing</h2>
            <TextField control={form.control} name="seoDefaultTitle" label="Default SEO title" />
            <FormField
              control={form.control}
              name="seoDefaultDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default SEO description</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <TextField control={form.control} name="canonicalUrl" label="Canonical site URL" placeholder="https://afripebbles.com" />
            <FormField
              control={form.control}
              name="socialShareImageUrl"
              render={({ field }) => <ImageUploader bucket="branding" label="Default social-sharing image" value={field.value} onChange={field.onChange} />}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Business &amp; commerce</h2>
            <TextField control={form.control} name="businessCountry" label="Business country" />
            <FormField
              control={form.control}
              name="supportedRegions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supported regions</FormLabel>
                  <TagsInput value={field.value} onChange={field.onChange} placeholder="e.g. Ghana, Germany" />
                </FormItem>
              )}
            />
            <TextField control={form.control} name="defaultCurrency" label="Default currency" placeholder="EUR" />
            <TextField control={form.control} name="podcastLaunchStatus" label="Podcast launch status" placeholder="pre_launch or launched" />
            <TextField control={form.control} name="shopStatus" label="Shop status notice" placeholder="e.g. Shop is open" />
            <FormField
              control={form.control}
              name="preorderNotice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pre-order notice</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shippingNotice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shipping notice</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="affiliateDisclosure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Affiliate disclosure</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                  <FormDescription>Individual recommendations can override this with their own disclosure text.</FormDescription>
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Newsletter &amp; footer</h2>
            <FormField
              control={form.control}
              name="newsletterWording"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Newsletter wording</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="footerText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Footer text</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
