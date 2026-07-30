import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { useForm } from "react-hook-form";
import { useSubmitCollaborationEnquiry } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Camera, Send, MessageSquare, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { siteConfig } from "@/content/site";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  campaignType: z.string().min(1, "Please select a collaboration type"),
  budgetRange: z.string().optional(),
  timeline: z.string().optional(),
  links: z.string().optional(),
  message: z.string().min(10, "Please provide more details about the campaign"),
});

type FormValues = z.infer<typeof schema>;

export default function Collaborate() {
  const { toast } = useToast();
  const mutation = useSubmitCollaborationEnquiry();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      campaignType: "",
      budgetRange: "",
      timeline: "",
      links: "",
      message: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(
      { data },
      {
        onSuccess: () => {
          toast({
            title: "Enquiry Sent!",
            description: "Thank you for reaching out. We will get back to you shortly.",
          });
          form.reset();
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Something went wrong",
            description: "Please try submitting your enquiry again.",
          });
        },
      }
    );
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <Layout>
      <Seo
        title="Collaborate"
        description="Partner with AfriPebbles on UGC content, sponsored posts, product features, and creative campaigns."
        path="/collaborate"
      />
      <div className="container mx-auto px-4 py-20 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="space-y-8 lg:sticky lg:top-32">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
              <Camera size={28} />
            </div>
            <h1 className="text-4xl md:text-6xl font-serif leading-tight">Partner with <br/><span className="italic text-primary">AfriPebbles</span></h1>
            <div className="prose prose-stone text-foreground/80 font-sans leading-relaxed">
              <p>
                We believe in authentic storytelling that resonates with women seeking intentional growth. As a UGC creator and brand partner, AfriPebbles brings a warm, editorial, and sophisticated aesthetic to every campaign.
              </p>
              <h3 className="text-xl font-serif text-foreground mt-8 mb-4">What to Expect</h3>
              <ul className="space-y-4 list-none pl-0">
                <li className="flex gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0"></span>
                  <span><strong>Authentic Representation:</strong> Content that feels natural, lived-in, and trustworthy to an engaged audience.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0"></span>
                  <span><strong>Editorial Quality:</strong> Imagery and video that aligns with premium brand standards.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0"></span>
                  <span><strong>Clear Communication:</strong> Professional, timely correspondence from pitch to deliverable.</span>
                </li>
              </ul>
            </div>

            <div className="pt-8 border-t border-border">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-foreground/60 mb-3">Available For</h4>
              <div className="flex flex-wrap gap-2">
                {siteConfig.collaborationTypes.map((type) => (
                  <span key={type} className="px-3 py-1.5 rounded-full bg-muted/50 text-sm text-foreground/80">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <div className="bg-background rounded-3xl p-8 md:p-12 border border-border shadow-sm">
              <h2 className="text-2xl font-serif mb-6">Start a Conversation</h2>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} className="bg-muted/30" />
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
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="jane@company.com" {...field} className="bg-muted/30" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand / Company (Optional)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Your Brand" {...field} className="pl-9 bg-muted/30" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="campaignType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collaboration Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-muted/30">
                              <SelectValue placeholder="Select a collaboration type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {siteConfig.collaborationTypes.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="budgetRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget Range (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. €200–€500" {...field} className="bg-muted/30" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="timeline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeline (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Within 4 weeks" {...field} className="bg-muted/30" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="links"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relevant Links (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Brand website, brief, or portfolio link" {...field} className="bg-muted/30" />
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
                        <FormLabel>Project Details</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Textarea
                              placeholder="Tell us about your brand and what you have in mind for this collaboration..."
                              className="min-h-[150px] pl-9 bg-muted/30 resize-none"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-xl gap-2"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? "Sending..." : "Submit Enquiry"} <Send size={18} />
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
