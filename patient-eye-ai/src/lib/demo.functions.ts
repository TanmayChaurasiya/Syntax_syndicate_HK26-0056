import { createServerFn } from "@tanstack/react-start";

const DEMO = [
  { email: "doctor@vitalwatch.demo", role: "doctor", full_name: "Dr. Priya Raman" },
  { email: "nurse@vitalwatch.demo", role: "nurse", full_name: "Nurse Sam Ortiz" },
  { email: "admin@vitalwatch.demo", role: "admin", full_name: "Admin Jordan Lee" },
] as const;
const PASSWORD = "Demo@1234";

// Idempotent: only ever creates the three fixed demo accounts and wires them to seed patients.
export const ensureDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw new Error(error.message);
  const ids: Record<string, string> = {};
  for (const d of DEMO) {
    let u = list.users.find((x) => x.email === d.email);
    if (!u) {
      const { data, error: e } = await supabaseAdmin.auth.admin.createUser({
        email: d.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: d.full_name },
      });
      if (e) throw new Error(e.message);
      u = data.user!;
    }
    ids[d.role] = u.id;
    await supabaseAdmin.from("user_roles").upsert({ user_id: u.id, role: d.role }, { onConflict: "user_id,role" });
  }
  const { data: pts } = await supabaseAdmin.from("patients").select("id, assigned_provider_id").order("name");
  if (pts && pts.some((p) => !p.assigned_provider_id)) {
    const nurseIds = pts.filter((_, i) => i % 2 === 0).map((p) => p.id);
    const docIds = pts.filter((_, i) => i % 2 === 1).map((p) => p.id);
    await supabaseAdmin.from("patients").update({ assigned_provider_id: ids["nurse"]! }).in("id", nurseIds);
    await supabaseAdmin.from("patients").update({ assigned_provider_id: ids["doctor"]! }).in("id", docIds);
  }
  return { ok: true };
});
