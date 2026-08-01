import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export default function AdminForgotPassword() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    setSubmitting(false);
    // Always show the same confirmation regardless of whether the email is
    // registered — don't let this form be used to enumerate admin accounts.
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm bg-background rounded-2xl border border-border shadow-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <KeyRound size={20} />
          </div>
          <h1 className="text-2xl font-serif">Reset your password</h1>
        </div>

        {!isSupabaseConfigured ? (
          <p className="text-sm text-center text-foreground/70">Admin sign-in isn&apos;t configured yet.</p>
        ) : sent ? (
          <p className="text-sm text-center text-foreground/70">
            If that email has an admin account, a reset link is on its way. Check your inbox.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="username" placeholder="you@afripebbles.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          </Form>
        )}

        <div className="text-center">
          <Link href="/login" className="text-sm text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
