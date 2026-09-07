#!/usr/bin/env node
// Promotes an EXISTING account to super_admin. This is the ONLY way to
// create the first super_admin — there is no public admin signup, and no
// client (including this website's own /admin/admins page) is ever allowed
// to elevate anyone to super_admin (see admin_set_user_role in the
// admin_panel migration: a plain admin is explicitly forbidden from doing
// so). Run this locally, once, with the service role key — never from a
// deployed environment or a client-facing script.
//
// Usage: node scripts/promote-admin.mjs owner@example.com

import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]
if (!email) {
  console.error('Uso: node scripts/promote-admin.mjs <email>')
  process.exit(1)
}

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente antes de rodar este script.')
  console.error('Nunca coloque SUPABASE_SERVICE_ROLE_KEY em .env.local (esse arquivo é lido pelo Next.js e pode vazar para o cliente).')
  process.exit(1)
}

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })

const { data: profile, error: findError } = await admin.from('profiles').select('id, role').eq('email', email).maybeSingle()

if (findError) {
  console.error('Erro ao buscar o usuário:', findError.message)
  process.exit(1)
}

if (!profile) {
  console.error(`Nenhuma conta encontrada com o e-mail "${email}". A pessoa precisa criar a conta normalmente (site ou app) primeiro.`)
  process.exit(1)
}

if (profile.role === 'super_admin') {
  console.log(`"${email}" já é super_admin.`)
  process.exit(0)
}

// Service role bypasses RLS/column grants entirely — this is the one place
// in the whole system allowed to set role directly, since it's run by a
// human with infrastructure access, not by any application code path.
const { error: updateError } = await admin.from('profiles').update({ role: 'super_admin' }).eq('id', profile.id)

if (updateError) {
  console.error('Erro ao promover o usuário:', updateError.message)
  process.exit(1)
}

await admin.from('admin_audit_log').insert({
  admin_user_id: profile.id,
  action_type: 'ADMIN_ROLE_CHANGED',
  target_user_id: profile.id,
  target_object_type: 'profile',
  target_object_id: profile.id,
  previous_value: { role: profile.role },
  new_value: { role: 'super_admin' },
  reason: 'Promovido via scripts/promote-admin.mjs (bootstrap do primeiro super_admin).'
})

console.log(`"${email}" agora é super_admin.`)
