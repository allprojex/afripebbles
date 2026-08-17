import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { useSubscribeNewsletter } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Mail, Sparkles, HeartHandshake, Coffee, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(2, "First name is required"),
  consent: z.boolean().refine((v) => v === true, { message: "Please agree to receive emails to join." }),
});

type FormValues = z.infer<typeof schema>;

export default function Community() {
  const { toast } = useToast();
  const mutation = useSubscribeNewsletter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      firstName: "",
      consent: false,
    },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(
      { data: { email: data.email, firstName: data.firstName, consent: data.consent } },
      {
        onSuccess: () => {
          toast({
            title: "Welcome to the family!",
            description: "We're so glad you're here. Check your inbox soon.",
          });
          form.reset();
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Something went wrong",
            description: "Please try subscribing again.",
          });
        },
      }
    );
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const perks = [
    { icon: <Sparkles className="w-5 h-5 text-primary" />, title: "Curated Encouragement", desc: "Weekly notes to start your week with intention." },
    { icon: <HeartHandshake className="w-5 h-5 text-primary" />, title: "Exclusive Access", desc: "First dibs on new shop drops and limited pre-orders." },
    { icon: <Coffee className="w-5 h-5 text-primary" />, title: "Behind the Scenes", desc: "Honest thoughts on the messy, beautiful middle of growth." },
  ];

  return (
    <Layout>
      <Seo
        title="Community"
        description="Join the AfriPebbles community for gentle encouragement, curated resources, and updates in your inbox."
        path="/community"
      />
      <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] relative overflow-hidden bg-background">
        {/* Soft background elements */}
        <div className="absolute top-1/4 -left-64 w-96 h-96 bg-secondary/30 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-64 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto bg-white/40 backdrop-blur-xl border border-white/50 shadow-2xl rounded-[3rem] p-8 md:p-16 overflow-hidden">
            
            <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center relative">
              <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="space-y-8">
                <div className="w-14 h-14 bg-background border border-border shadow-sm rounded-full flex items-center justify-center mb-2">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-serif leading-tight mb-4">Join the <br/>AfriPebbles <span className="italic text-primary">Community</span></h1>
                  <p className="text-foreground/70 text-lg leading-relaxed">
                    A quiet space in your inbox. No spam, no rush—just gentle encouragement, curated resources, and an invitation to live on purpose.
                  </p>
                </div>

                <div className="space-y-6 pt-4 border-t border-border/50">
                  {perks.map((perk, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1 bg-background rounded-full p-1.5 shadow-sm border border-border">{perk.icon}</div>
                      <div>
                        <h4 className="font-medium text-foreground">{perk.title}</h4>
                        <p className="text-sm text-foreground/60">{perk.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
                <div className="bg-background rounded-3xl p-8 border border-border shadow-sm">
                  <h3 className="font-serif text-2xl mb-6">You're invited.</h3>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Your first name" {...field} className="h-12 bg-muted/30" />
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
                            <FormControl>
                              <Input placeholder="Your email address" type="email" {...field} className="h-12 bg-muted/30" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="consent"
                        render={({ field }) => (
                          <FormItem className="flex items-start gap-2 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} className="mt-0.5" />
                            </FormControl>
                            <div>
                              <p className="text-xs text-foreground/60 leading-relaxed">
                                I agree to receive emails from AfriPebbles. See our{" "}
                                <Link href="/privacy" className="underline hover:text-primary">
                                  Privacy Policy
                                </Link>
                                .
                              </p>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full h-12 rounded-xl mt-4 group"
                        disabled={mutation.isPending}
                      >
                        {mutation.isPending ? "Subscribing..." : "Join Now"}
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </form>
                  </Form>
                  <p className="text-xs text-center text-foreground/40 mt-6">
                    We respect your privacy and will never share your information. You can unsubscribe at any time.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
