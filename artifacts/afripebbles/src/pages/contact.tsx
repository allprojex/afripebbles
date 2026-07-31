import { useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { useSubmitContactEnquiry, useGetSiteSettings } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Mail, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resolveSiteSettings } from "@/lib/settings";

const INQUIRY_LABELS: Record<string, string> = {
  general: "General question",
  collaboration: "Collaboration",
  "order-support": "Order support",
  product: "Product enquiry",
};

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  inquiryType: z.enum(["general", "collaboration", "order-support", "product"]),
  subject: z.string().optional(),
  message: z.string().min(10, "Please share a few more details"),
  consentGiven: z.boolean().refine((v) => v === true, {
    message: "Please confirm you're okay with us storing this to respond to you.",
  }),
});

type FormValues = z.infer<typeof schema>;

export default function Contact() {
  const { toast } = useToast();
  const mutation = useSubmitContactEnquiry();
  const search = useSearch();

  const params = new URLSearchParams(search);
  const inquiryTypeParam = params.get("inquiryType");
  const subjectParam = params.get("subject");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      inquiryType: (inquiryTypeParam as FormValues["inquiryType"]) || "general",
      subject: subjectParam || "",
      message: "",
      consentGiven: false,
    },
  });

  useEffect(() => {
    if (inquiryTypeParam) form.setValue("inquiryType", inquiryTypeParam as FormValues["inquiryType"]);
    if (subjectParam) form.setValue("subject", subjectParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryTypeParam, subjectParam]);

  const onSubmit = (data: FormValues) => {
    mutation.mutate(
      { data },
      {
        onSuccess: () => {
          toast({
            title: "Message sent",
            description: "Thank you for reaching out — we'll get back to you soon.",
          });
          form.reset();
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Something went wrong",
            description: "Your message wasn't sent. Please try again.",
          });
        },
      }
    );
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const { data: siteSettings } = useGetSiteSettings();
  const resolved = resolveSiteSettings(siteSettings);
  const socialLinks = resolved.socialLinks;

  return (
    <Layout>
      <Seo title="Contact" description="Get in touch with AfriPebbles for general questions, collaborations, or order support." path="/contact" />
      <div className="container mx-auto px-4 py-20 max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="space-y-8 lg:sticky lg:top-32">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
              <Mail size={28} />
            </div>
            <h1 className="text-4xl md:text-6xl font-serif leading-tight">Let's <span className="italic text-primary">Talk</span></h1>
            <p className="text-lg text-foreground/70 leading-relaxed">
              Whether it's a general question, a collaboration idea, or help with an order — we'd love to hear
              from you. The form is the most reliable way to reach AfriPebbles right now.
            </p>
            <div className="space-y-4 pt-4 border-t border-border">
              <div>
                <h4 className="font-semibold text-sm uppercase tracking-wider text-foreground/60 mb-1">Collaborations</h4>
                <p className="text-sm text-foreground/70">
                  Have a brand in mind? Visit the <a href="/collaborate" className="text-primary hover:underline">Collaborate page</a> for a dedicated form.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm uppercase tracking-wider text-foreground/60 mb-1">Order support</h4>
                <p className="text-sm text-foreground/70">
                  Choose "Order support" below and share your order details so we can help.
                </p>
              </div>
            </div>
            {socialLinks.length > 0 && (
              <div className="pt-4 border-t border-border">
                <h4 className="font-semibold text-sm uppercase tracking-wider text-foreground/60 mb-2">Follow along</h4>
                <div className="flex flex-wrap gap-3">
                  {socialLinks.map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {resolved.whatsappNumber && (
              <a href={resolved.whatsappNumber} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                <MessageCircle size={16} /> Chat on WhatsApp
              </a>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <div className="bg-background rounded-3xl p-8 md:p-12 border border-border shadow-sm">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} className="bg-muted/30" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@example.com" {...field} className="bg-muted/30" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="inquiryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What's this about?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-muted/30">
                              <SelectValue placeholder="Select an inquiry type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(INQUIRY_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="A short summary" {...field} className="bg-muted/30" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea placeholder="How can we help?" className="min-h-[140px] bg-muted/30 resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="consentGiven"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal">
                            I agree that AfriPebbles can store this information to respond to my message.
                          </FormLabel>
                          <FormDescription>
                            See our <a href="/privacy" className="underline hover:text-primary">Privacy Policy</a> for details.
                          </FormDescription>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" size="lg" className="w-full rounded-xl gap-2" disabled={mutation.isPending}>
                    {mutation.isPending ? "Sending..." : "Send Message"} <Send size={18} />
                  </Button>
                </form>
              </Form>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
