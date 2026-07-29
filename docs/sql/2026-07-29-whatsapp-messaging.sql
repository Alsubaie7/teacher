/* ==========================================================================
   التواصل مع المشتركين — واتساب وإعلانات المنصة
   يُنفَّذ يدوياً من محرر SQL في لوحة Supabase (لا يوجد نظام هجرات آلي)
   المواصفة: docs/superpowers/specs/2026-07-29-whatsapp-subscriber-messaging-design.md
   ========================================================================== */

/* ==========================================================================
   القسم 1 — الجوال والموافقة على التواصل عبر واتساب
   ========================================================================== */

alter table public.profiles add column if not exists phone        text;
alter table public.profiles add column if not exists wa_optin     boolean not null default false;
alter table public.profiles add column if not exists wa_optin_at  timestamptz;
alter table public.profiles add column if not exists wa_optin_src text;
alter table public.profiles add column if not exists wa_optout_at timestamptz;
alter table public.profiles add column if not exists ann_seen_at  timestamptz;

-- الرقم يُخزَّن أرقاماً فقط بصيغة دولية بلا + : 9665xxxxxxxx
alter table public.profiles drop constraint if exists profiles_phone_format;
alter table public.profiles add constraint profiles_phone_format
  check (phone is null or phone ~ '^[0-9]{9,15}$');

/* ختم الموافقة يتم في الخادم لا في المتصفح.
   السبب ليس أمنياً فقط: يوم التقدم لـ Meta يُطلب دليل على وقت الموافقة،
   وطابع زمني يكتبه العميل ليس دليلاً. */
create or replace function public.stamp_wa_optin()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.wa_optin then new.wa_optin_at := now(); end if;
    return new;
  end if;

  if new.wa_optin is distinct from old.wa_optin then
    if new.wa_optin then
      new.wa_optin_at  := now();
      new.wa_optout_at := null;
    else
      new.wa_optout_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_wa_optin on public.profiles;
create trigger trg_stamp_wa_optin
  before insert or update on public.profiles
  for each row execute function public.stamp_wa_optin();


/* ==========================================================================
   تحديث get_all_users
   ⚠️ يعتمد على public.contact_log المُعرَّف في القسم 3 أدناه.
      نفّذ القسم 3 قبل هذه الكتلة إن كنت تنفّذ الملف على مراحل.
   ========================================================================== */

/* get_all_users تُعاد كتابتها لإضافة الجوال وحالة الموافقة وآخر تواصل.
   الحماية كما هي: security definer + شرط is_admin() داخل الاستعلام. */
drop function if exists public.get_all_users();
create or replace function public.get_all_users()
returns table (
  id              uuid,
  email           text,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  name            text,
  school          text,
  subject         text,
  stage           text,
  gender          text,
  approved        boolean,
  role            text,
  classes_count   int,
  students_count  int,
  expires_at      timestamptz,
  sub_note        text,
  phone           text,
  wa_optin        boolean,
  wa_optout_at    timestamptz,
  last_contact_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select au.id,
         au.email::text,
         au.created_at,
         au.last_sign_in_at,
         p.name, p.school, p.subject, p.stage, p.gender,
         coalesce(p.approved, false),
         coalesce(p.role, 'teacher'),
         public.safe_json_len((select ud.value from public.user_data ud
                                where ud.user_id = au.id and ud.key = 'classes')),
         public.safe_json_len((select ud.value from public.user_data ud
                                where ud.user_id = au.id and ud.key = 'students')),
         s.expires_at,
         s.note,
         p.phone,
         coalesce(p.wa_optin, false),
         p.wa_optout_at,
         (select max(cl.sent_at) from public.contact_log cl where cl.user_id = au.id)
  from auth.users au
  left join public.profiles      p on p.id = au.id
  left join public.subscriptions s on s.user_id = au.id
  where public.is_admin()
  order by au.created_at;
$$;

revoke all on function public.get_all_users() from public, anon;
grant execute on function public.get_all_users() to authenticated, service_role;
