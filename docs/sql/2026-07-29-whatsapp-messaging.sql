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
   القسم 2 — الإعلانات داخل المنصة
   ========================================================================== */

create table if not exists public.announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  kind         text not null default 'notice'
               check (kind in ('feature','offer','notice')),
  cta_label    text,
  cta_route    text,
  audience     text not null default 'all'
               check (audience in ('all','subscribers','expiring','expired')),
  published_at timestamptz not null default now(),
  expires_at   timestamptz,
  created_by   uuid references auth.users(id) on delete set null
);

create index if not exists idx_announcements_published
  on public.announcements (published_at desc);

alter table public.announcements enable row level security;

/* قراءة المنشور غير المنتهي فقط. لا سياسة insert/update/delete إطلاقاً —
   الكتابة عبر دوال الأدمن حصراً، تماماً كنموذج بقية لوحة الإدارة. */
drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements
  for select to authenticated
  using (published_at <= now() and (expires_at is null or expires_at > now()));

grant select on public.announcements to authenticated;

/* فلترة الجمهور تتم في الخادم. إرسال كل الإعلانات ثم إخفاء بعضها
   في الواجهة ليس إخفاءً. */
create or replace function public.get_my_announcements()
returns setof public.announcements
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with st as (
    select (select s.expires_at from public.subscriptions s
             where s.user_id = auth.uid()) as exp
  )
  select a.*
  from public.announcements a, st
  where a.published_at <= now()
    and (a.expires_at is null or a.expires_at > now())
    and (
      a.audience = 'all'
      or (a.audience = 'subscribers' and st.exp is not null and st.exp >  now())
      or (a.audience = 'expiring'    and st.exp is not null and st.exp >  now()
                                     and st.exp <= now() + interval '14 days')
      or (a.audience = 'expired'     and (st.exp is null or st.exp <= now()))
    )
  order by a.published_at desc
  limit 30;
$$;

revoke all on function public.get_my_announcements() from public, anon;
grant execute on function public.get_my_announcements() to authenticated;

/* نشر إعلان — المسارات مقيّدة بقائمة بيضاء، فلا رابط خارجي حر
   حتى في حال اختراق حساب أدمن. */
create or replace function public.admin_publish_announcement(
  p_title      text,
  p_body       text,
  p_kind       text,
  p_audience   text,
  p_cta_label  text default null,
  p_cta_route  text default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;
  if coalesce(btrim(p_title), '') = '' or coalesce(btrim(p_body), '') = '' then
    raise exception 'العنوان والنص مطلوبان';
  end if;
  if p_cta_route is not null and p_cta_route not in
     ('dashboard','classes','lessons','analytics','referrals','settings') then
    raise exception 'مسار غير مسموح: %', p_cta_route;
  end if;

  insert into public.announcements (title, body, kind, audience, cta_label, cta_route, expires_at, created_by)
  values (btrim(p_title), btrim(p_body), p_kind, p_audience,
          nullif(btrim(coalesce(p_cta_label, '')), ''), p_cta_route, p_expires_at, auth.uid())
  returning id into v_id;

  perform public.log_admin_action('announcement_published', null, null,
          jsonb_build_object('title', btrim(p_title), 'audience', p_audience, 'kind', p_kind));
  return v_id;
end;
$$;

revoke all on function public.admin_publish_announcement(text,text,text,text,text,text,timestamptz) from public, anon;
grant execute on function public.admin_publish_announcement(text,text,text,text,text,text,timestamptz) to authenticated;

create or replace function public.admin_delete_announcement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_title text;
begin
  if not public.is_admin() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;
  delete from public.announcements where id = p_id returning title into v_title;
  perform public.log_admin_action('announcement_deleted', null, null,
          jsonb_build_object('title', v_title));
end;
$$;

revoke all on function public.admin_delete_announcement(uuid) from public, anon;
grant execute on function public.admin_delete_announcement(uuid) to authenticated;

/* قائمة كل الإعلانات للأدمن (بما فيها المنتهية) — سياسة القراءة تخفي المنتهي
   عن الجميع، والأدمن يحتاج رؤيته ليحذفه. */
create or replace function public.admin_list_announcements()
returns setof public.announcements
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.* from public.announcements a
  where public.is_admin()
  order by a.published_at desc
  limit 100;
$$;

revoke all on function public.admin_list_announcements() from public, anon;
grant execute on function public.admin_list_announcements() to authenticated;


/* ==========================================================================
   القسم 3 — سجل التواصل وقوالب رسائل واتساب
   ========================================================================== */

create table if not exists public.contact_log (
  id       bigserial primary key,
  user_id  uuid not null references auth.users(id) on delete cascade,
  channel  text not null default 'whatsapp',
  template text,
  sent_at  timestamptz not null default now(),
  by_id    uuid references auth.users(id) on delete set null
);

create index if not exists idx_contact_log_user on public.contact_log (user_id, sent_at desc);

alter table public.contact_log enable row level security;

-- القراءة للأدمن فقط، والكتابة عبر الدالة حصراً (لا سياسة insert)
drop policy if exists contact_log_read on public.contact_log;
create policy contact_log_read on public.contact_log
  for select to authenticated using (public.is_admin());

grant select on public.contact_log to authenticated;

/* تسجيل محاولة تواصل. تُنادى فور ضغط زر واتساب — لا ضغطة تأكيد ثانية،
   لأن التأكيد اليدوي يُنسى فيصير السجل ناقصاً بلا فائدة. */
create or replace function public.admin_log_contact(p_user uuid, p_template text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;
  insert into public.contact_log (user_id, channel, template, by_id)
  values (p_user, 'whatsapp', p_template, auth.uid());
end;
$$;

revoke all on function public.admin_log_contact(uuid, text) from public, anon;
grant execute on function public.admin_log_contact(uuid, text) to authenticated;

/* عدّاد اليوم — يذكّر الأدمن بحدود الرقم العادي ولا يمنعه */
create or replace function public.admin_contacts_today()
returns int
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(count(*), 0)::int from public.contact_log
  where public.is_admin() and sent_at >= date_trunc('day', now());
$$;

revoke all on function public.admin_contacts_today() from public, anon;
grant execute on function public.admin_contacts_today() to authenticated;

/* القوالب في app_settings حتى تُعدَّل من اللوحة بلا نشر كود.
   {name} {days} {date} {link} تُستبدل في المتصفح.
   كل قالب ينتهي باسم المنصة وجملة إيقاف — هذا ما يمنع المعلم من الضغط
   على «حظر/بلاغ»، والبلاغات هي ما يقتل الأرقام. */
insert into public.app_settings (key, value)
values ('wa_templates', '{"before7":"السلام عليكم {name} 🌿\nاشتراكك في منصة المعلم ينتهي بعد {days} أيام (بتاريخ {date}).\nللتجديد: {link}\n\nمنصة المعلم\nللإيقاف اكتب: إيقاف","before1":"السلام عليكم {name} 🌿\nتذكير: اليوم آخر يوم في اشتراكك بمنصة المعلم.\nللتجديد: {link}\n\nمنصة المعلم\nللإيقاف اكتب: إيقاف","after3":"السلام عليكم {name} 🌿\nانتهى اشتراكك في منصة المعلم قبل {days} أيام، وبياناتك محفوظة كما هي.\nللعودة: {link}\n\nمنصة المعلم\nللإيقاف اكتب: إيقاف"}')
on conflict (key) do nothing;


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
