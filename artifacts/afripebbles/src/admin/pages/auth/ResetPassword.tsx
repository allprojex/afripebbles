import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function AdminResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(Boolean(data.session));
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasRecoverySession(Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    setSubmitting(false);

    if (error) {
      toast({ variant: "destructive", title: "Couldn't update password", description: error.message });
      return;
    }

    toast({ title: "Password updated", description: "You're signed in with your new password." });
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm bg-background rounded-2xl border border-border shadow-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <h1 className="text-2xl font-serif">Set a new password</h1>
        </div>

        {!ready ? (
          <p className="text-sm text-center text-foreground/60">Checking your reset link…</p>
        ) : !isSupabaseConfigured ? (
          <p className="text-sm text-center text-foreground/70">Admin sign-in isn&apos;t configured yet.</p>
        ) : !hasRecoverySession ? (
          <p className="text-sm text-center text-foreground/70">
            This reset link is invalid or has expired. Request a new one from the{" "}
            <Link href="/forgot-password" className="text-primary hover:underline">
              forgot password
            </Link>{" "}
            page.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Saving…" : "Update password"}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}
