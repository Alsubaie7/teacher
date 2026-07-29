/* ==========================================================================
   تفعيل حجب المشترك المنتهي — وضع «قراءة فقط»
   يُنفَّذ يدوياً من محرر SQL في لوحة Supabase (لا يوجد نظام هجرات آلي)

   ⚠️ enforce_subscription = '0' افتراضياً، وهذا مقصود:
   كل الحسابات القائمة بلا اشتراك ساري، فتشغيل الحجب قبل ضبط تواريخ
   الاشتراكات يقفل المنصة على كل المعلمين في لحظة واحدة. يُشغَّل المفتاح
   من لوحة الإدارة بعد ضبط التواريخ.
   ========================================================================== */

-- '1' = الحجب مفعّل · '0' = معطّل (الافتراضي)
insert into public.app_settings (key, value)
values ('enforce_subscription', '0')
on conflict (key) do nothing;

-- أيام السماح بعد تاريخ الانتهاء قبل بدء الحجب
insert into public.app_settings (key, value)
values ('grace_days', '3')
on conflict (key) do nothing;

select key, value from public.app_settings
where key in ('enforce_subscription','grace_days','pay_link','support_wa')
order by key;
