/* ==========================================================================
   إعادة بناء لوحة الإدارة — تعديلات قاعدة البيانات
   المشروع: Teacher Platform (qqlmcibtwonierjctbqr)
   التاريخ: 2026-07-28

   الحالة: مُطبَّق بالكامل على المشروع بتاريخ 2026-07-28.
   محفوظ هنا كمرجع ولإعادة التطبيق على أي بيئة أخرى — آمن للتكرار (idempotent).
   ========================================================================== */

/* ==========================================================================
   القسم 1 — الأدوار ومنع تصعيد الصلاحيات
   ========================================================================== */

-- عمود الدور + ترقية حساب الأدمن الحالي
alter table public.profiles add column if not exists role text not null default 'teacher';
update public.profiles set role = 'admin' where lower(email) = 'nassserf999@gmail.com';

-- دالة التحقق من الأدمن (SECURITY DEFINER لتتجاوز RLS بلا تكرار لا نهائي)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

/* حماية حرجة: سياسة profiles_update كانت تسمح لأي معلم بتعديل صفّه بالكامل،
   أي أنه يستطيع تنفيذ update profiles set approved = true بالمفتاح العام
   ويتجاوز موافقة الإدارة. هذا المشغّل يمنع تعديل role و approved إلا للأدمن. */
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role     := 'teacher';
    new.approved := false;
  else
    new.role     := old.role;
    new.approved := old.approved;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_privileges on public.profiles;
create trigger trg_guard_profile_privileges
  before insert or update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- سياسات profiles تعتمد الدور بدل الإيميل المكتوب يدوياً
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete using (public.is_admin());


/* ==========================================================================
   القسم 2 — إعدادات المنصة العامة (إصلاح قفل المنصة)

   القفل كان يُكتب في user_data تحت user_id الأدمن، وسياسة الجدول
   (auth.uid() = user_id) تمنع أي شخص آخر من قراءته — فكان القفل بلا أثر.
   ========================================================================== */

create table if not exists public.app_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.app_settings enable row level security;

-- القراءة متاحة للجميع (يحتاجها الزائر قبل التسجيل)
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings
  for select to anon, authenticated using (true);

-- الكتابة للأدمن فقط
drop policy if exists app_settings_write on public.app_settings;
create policy app_settings_write on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.app_settings to anon, authenticated;
grant insert, update, delete on public.app_settings to authenticated;

-- تهيئة المفتاح ونقل القيمة الحالية من user_data إن وُجدت
insert into public.app_settings (key, value) values ('platform_open', '1')
  on conflict (key) do nothing;

update public.app_settings s
   set value = ud.value
  from public.user_data ud
 where ud.key = 'platform_open' and s.key = 'platform_open';

delete from public.user_data where key = 'platform_open';

-- تبديل حالة المنصة (مع تسجيلها في سجل التدقيق)
create or replace function public.admin_set_setting(p_key text, p_value text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;
  insert into public.app_settings (key, value, updated_at, updated_by)
  values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update
    set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;

  perform public.log_admin_action('setting_changed', null, null,
          jsonb_build_object('key', p_key, 'value', p_value));
end;
$$;

revoke all on function public.admin_set_setting(text, text) from public;
grant execute on function public.admin_set_setting(text, text) to authenticated;


/* ==========================================================================
   القسم 3 — سجل التدقيق
   ========================================================================== */

create table if not exists public.audit_log (
  id           bigserial primary key,
  actor_id     uuid,
  actor_email  text,
  action       text not null,
  target_id    uuid,
  target_email text,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- القراءة للأدمن فقط، والكتابة عبر الدوال حصراً (لا سياسة insert)
drop policy if exists audit_log_read on public.audit_log;
create policy audit_log_read on public.audit_log
  for select to authenticated using (public.is_admin());

grant select on public.audit_log to authenticated;

create or replace function public.log_admin_action(
  p_action       text,
  p_target_id    uuid    default null,
  p_target_email text    default null,
  p_details      jsonb   default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;
  insert into public.audit_log (actor_id, actor_email, action, target_id, target_email, details)
  values (auth.uid(),
          (select email from public.profiles where id = auth.uid()),
          p_action, p_target_id, p_target_email, coalesce(p_details, '{}'::jsonb));
end;
$$;

revoke all on function public.log_admin_action(text, uuid, text, jsonb) from public;
grant execute on function public.log_admin_action(text, uuid, text, jsonb) to authenticated;


/* ==========================================================================
   القسم 4 — الاشتراكات
   ========================================================================== */

-- السياسات تُسقط أولاً: Postgres يمنع تغيير نوع عمود مستخدم داخل تعريف سياسة
drop policy if exists "users read own subscription" on public.subscriptions;
drop policy if exists subscriptions_select       on public.subscriptions;
drop policy if exists subscriptions_admin_write  on public.subscriptions;

-- توحيد نوع المعرّف مع بقية الجداول
do $$
begin
  if (select data_type from information_schema.columns
       where table_schema='public' and table_name='subscriptions' and column_name='user_id') = 'text' then
    delete from public.subscriptions
     where user_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
    alter table public.subscriptions alter column user_id type uuid using user_id::uuid;
  end if;
end $$;

alter table public.subscriptions add column if not exists note       text;
alter table public.subscriptions add column if not exists updated_at timestamptz not null default now();

-- الصفوف اليتيمة تمنع إضافة المفتاح الأجنبي
delete from public.subscriptions s
 where not exists (select 1 from auth.users au where au.id = s.user_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_user_id_fkey') then
    alter table public.subscriptions
      add constraint subscriptions_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
end $$;

create policy subscriptions_select on public.subscriptions
  for select to authenticated using (auth.uid() = user_id or public.is_admin());

create policy subscriptions_admin_write on public.subscriptions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.subscriptions to authenticated;
grant insert, update, delete on public.subscriptions to authenticated;

create or replace function public.admin_set_subscription(
  p_user    uuid,
  p_expires timestamptz,
  p_note    text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;

  if p_expires is null then
    delete from public.subscriptions where user_id = p_user;
    perform public.log_admin_action('subscription_cleared', p_user,
            (select email from public.profiles where id = p_user), '{}'::jsonb);
    return;
  end if;

  insert into public.subscriptions (user_id, expires_at, note, updated_at)
  values (p_user, p_expires, p_note, now())
  on conflict (user_id) do update
    set expires_at = excluded.expires_at, note = excluded.note, updated_at = now();

  perform public.log_admin_action('subscription_set', p_user,
          (select email from public.profiles where id = p_user),
          jsonb_build_object('expires_at', p_expires, 'note', p_note));
end;
$$;

revoke all on function public.admin_set_subscription(uuid, timestamptz, text) from public;
grant execute on function public.admin_set_subscription(uuid, timestamptz, text) to authenticated;


/* ==========================================================================
   القسم 5 — دوال لوحة الإدارة

   get_all_users كانت SECURITY DEFINER بلا أي تحقق من الأدمن، وصلاحية
   التنفيذ ممنوحة لـ anon و PUBLIC — أي أن أي شخص يملك المفتاح العام
   (وهو منشور في app.js) كان يقدر يسحب إيميلات كل المعلمين بلا تسجيل دخول.
   ========================================================================== */

-- قياس عدد العناصر داخل قيمة JSON نصية بأمان (لا ترمي استثناءً عند تلف القيمة)
create or replace function public.safe_json_len(txt text)
returns int
language plpgsql
immutable
as $$
declare j jsonb;
begin
  if txt is null or txt = '' then return 0; end if;
  begin
    j := txt::jsonb;
  exception when others then
    return 0;
  end;
  if jsonb_typeof(j) = 'array' then return jsonb_array_length(j); end if;
  return 0;
end;
$$;

grant execute on function public.safe_json_len(text) to authenticated;

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
  sub_note        text
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
         s.note
  from auth.users au
  left join public.profiles      p on p.id = au.id
  left join public.subscriptions s on s.user_id = au.id
  where public.is_admin()
  order by au.created_at;
$$;

revoke all on function public.get_all_users() from public, anon;
grant execute on function public.get_all_users() to authenticated, service_role;

-- تفعيل / تعليق حساب (يسجّل في سجل التدقيق)
create or replace function public.admin_set_approval(p_user uuid, p_approved boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_email text;
begin
  if not public.is_admin() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;
  update public.profiles set approved = p_approved where id = p_user
    returning email into v_email;
  perform public.log_admin_action(
    case when p_approved then 'user_approved' else 'user_suspended' end,
    p_user, v_email, '{}'::jsonb);
end;
$$;

revoke all on function public.admin_set_approval(uuid, boolean) from public;
grant execute on function public.admin_set_approval(uuid, boolean) to authenticated;

-- تفعيل جميع الطلبات المعلّقة بطلب واحد
create or replace function public.admin_approve_all()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare n int;
begin
  if not public.is_admin() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;
  with upd as (
    update public.profiles set approved = true
     where coalesce(approved, false) = false and role <> 'admin'
     returning 1
  ) select count(*) into n from upd;
  if n > 0 then
    perform public.log_admin_action('bulk_approved', null, null,
            jsonb_build_object('count', n));
  end if;
  return n;
end;
$$;

revoke all on function public.admin_approve_all() from public;
grant execute on function public.admin_approve_all() to authenticated;

-- حذف حساب نهائياً (auth.users + كل بياناته)
create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp, auth
as $$
declare v_email text;
begin
  if not public.is_admin() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'لا يمكنك حذف حسابك أنت' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then
    raise exception 'لا يمكن حذف حساب أدمن' using errcode = '42501';
  end if;

  select email into v_email from public.profiles where id = p_user;
  if v_email is null then
    select au.email::text into v_email from auth.users au where au.id = p_user;
  end if;

  delete from public.user_data     where user_id = p_user;
  delete from public.subscriptions where user_id = p_user;
  delete from public.profiles      where id      = p_user;
  delete from auth.users           where id      = p_user;

  perform public.log_admin_action('user_deleted', p_user, v_email, '{}'::jsonb);
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- تغيير دور مستخدم (لإضافة أدمن ثانٍ بلا تعديل كود)
create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_email text;
begin
  if not public.is_admin() then
    raise exception 'غير مصرّح' using errcode = '42501';
  end if;
  if p_role not in ('teacher', 'admin') then
    raise exception 'دور غير معروف';
  end if;
  if p_user = auth.uid() and p_role <> 'admin' then
    raise exception 'لا يمكنك سحب صلاحيتك من نفسك' using errcode = '42501';
  end if;
  update public.profiles set role = p_role where id = p_user returning email into v_email;
  perform public.log_admin_action('role_changed', p_user, v_email,
          jsonb_build_object('role', p_role));
end;
$$;

revoke all on function public.admin_set_role(uuid, text) from public;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- آخر أحداث سجل التدقيق للوحة
create or replace function public.get_audit_log(p_limit int default 20)
returns setof public.audit_log
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select * from public.audit_log
   where public.is_admin()
   order by created_at desc
   limit least(coalesce(p_limit, 20), 200);
$$;

revoke all on function public.get_audit_log(int) from public, anon;
grant execute on function public.get_audit_log(int) to authenticated;


/* ==========================================================================
   القسم 6 — سحب صلاحية التنفيذ من الزائر المجهول

   Supabase يمنح anon صلاحية EXECUTE افتراضياً على كل دالة جديدة في public.
   الدوال محمية أصلاً بفحص is_admin() بداخلها، وهذه طبقة حماية ثانية.
   ملاحظة: is_admin() نفسها تبقى ممنوحة لـ anon لأن سياسات RLS تستدعيها
   أثناء تقييم صلاحيات الزائر (وترجع false له).
   ========================================================================== */

revoke execute on function public.log_admin_action(text, uuid, text, jsonb)       from anon;
revoke execute on function public.admin_set_setting(text, text)                   from anon;
revoke execute on function public.admin_set_subscription(uuid, timestamptz, text) from anon;
revoke execute on function public.admin_set_approval(uuid, boolean)               from anon;
revoke execute on function public.admin_approve_all()                             from anon;
revoke execute on function public.admin_delete_user(uuid)                         from anon;
revoke execute on function public.admin_set_role(uuid, text)                      from anon;
revoke execute on function public.get_audit_log(int)                              from anon;
