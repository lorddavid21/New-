"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

const registrationSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+?[0-9][0-9\s().-]{5,22}[0-9]$/, "Enter a valid phone number."),
  email: z.string().trim().email(),
  password: z.string().min(10).max(128),
  password_confirmation: z.string(),
}).refine((data) => data.password === data.password_confirmation, {
  path: ["password_confirmation"],
  message: "Passwords do not match.",
});

export async function loginAction(formData: FormData) {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return redirect("/login?error=invalid");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return redirect("/login?error=credentials");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", data.user.id)
    .single();

  if (profileError || profile?.account_status !== "active") {
    await supabase.auth.signOut();
    return redirect("/login?error=disabled");
  }
  redirect("/dashboard");
}

export async function registerAction(formData: FormData) {
  const parsed = registrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return redirect("/register?error=invalid");

  const { full_name, phone, email, password } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, phone } },
  });
  if (error) return redirect("/register?error=registration");
  if (!data.session) redirect("/login?notice=verify");
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) redirect("/dashboard?error=logout");
  redirect("/");
}
