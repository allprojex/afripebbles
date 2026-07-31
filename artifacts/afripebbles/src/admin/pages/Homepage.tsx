import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAdminGetHomepageContent, useAdminUpdateHomepageContent } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "../components/ImageUploader";

interface FormValues {
  heroHeading: string | null;
  heroSubheading: string | null;
  heroImageUrl: string | null;
  primaryCtaLabel: string | null;
  primaryCtaHref: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaHref: string | null;
  showPodcastSection: boolean;
  showShopSection: boolean;
  showJournalSection: boolean;
  showRecommendationsSection: boolean;
  showCollaborateSection: boolean;
  showNewsletterSection: boolean;
  newsletterHeading: string | null;
  newsletterBody: string | null;
  collaborateHeading: string | null;
  collaborateBody: string | null;
}

const SECTION_TOGGLES: { name: keyof FormValues; label: string }[] = [
  { name: "showPodcastSection", label: "Podcast section" },
  { name: "showShopSection", label: "Shop section" },
  { name: "showJournalSection", label: "Journal section" },
  { name: "showRecommendationsSection", label: "Recommendations section" },
  { name: "showCollaborateSection", label: "Collaboration section" },
  { name: "showNewsletterSection", label: "Newsletter section" },
];

export default function AdminHomepage() {
  const { data, isLoading } = useAdminGetHomepageContent();
  const updateMutation = useAdminUpdateHomepageContent();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    defaultValues: {
      heroHeading: null,
      heroSubheading: null,
      heroImageUrl: null,
      primaryCtaLabel: null,
      primaryCtaHref: null,
      secondaryCtaLabel: null,
      secondaryCtaHref: null,
      showPodcastSection: true,
      showShopSection: true,
      showJournalSection: true,
      showRecommendationsSection: true,
      showCollaborateSection: true,
      showNewsletterSection: true,
      newsletterHeading: null,
      newsletterBody: null,
      collaborateHeading: null,
      collaborateBody: null,
    },
  });

  useEffect(() => {
    if (data) form.reset(data);
  }, [data, form]);

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(
      { data: values },
      {
        onSuccess: () => toast({ title: "Homepage saved" }),
        onError: (err) => toast({ variant: "destructive", title: "Couldn't save", description: err instanceof Error ? err.message : undefined }),
      },
    );
  };

  if (isLoading) return <p className="text-foreground/50 text-sm">Loading…</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-serif mb-1">Homepage</h1>
        <p className="text-foreground/60">
          Leave a field blank to keep the site&apos;s default copy. Featured products, recommendations, and the podcast episode
          shown here come from each item&apos;s own &quot;Featured&quot; toggle.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10" noValidate>
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Hero</h2>
            <FormField
              control={form.control}
              name="heroHeading"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heading</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="No Dream Is Too Small In God's Hands"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="heroSubheading"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supporting text</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="heroImageUrl"
              render={({ field }) => <ImageUploader bucket="branding" label="Hero image" value={field.value} onChange={field.onChange} />}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primaryCtaLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary CTA label</FormLabel>
                    <FormControl>
                      <Input placeholder="Explore the Shop" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primaryCtaHref"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary CTA link</FormLabel>
                    <FormControl>
                      <Input placeholder="/shop" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="secondaryCtaLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary CTA label</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="secondaryCtaHref"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary CTA link</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Section visibility</h2>
            <div className="grid grid-cols-2 gap-3">
              {SECTION_TOGGLES.map(({ name, label }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Newsletter section wording</h2>
            <FormField
              control={form.control}
              name="newsletterHeading"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heading</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newsletterBody"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Collaboration section wording</h2>
            <FormField
              control={form.control}
              name="collaborateHeading"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heading</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="collaborateBody"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                  </FormControl>
                  <FormDescription>Featured items are managed from each item&apos;s own edit page.</FormDescription>
                </FormItem>
              )}
            />
          </section>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save homepage"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
