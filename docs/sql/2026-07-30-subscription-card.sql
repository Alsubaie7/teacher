/* ==========================================================================
   بطاقة الاشتراك وزرّا التجديد
   يُنفَّذ يدوياً من محرر SQL في لوحة Supabase (لا يوجد نظام هجرات آلي)

   الإعدادان يُقرآن من app_settings لا من الكود، حتى يُبدَّلا من لوحة
   الإدارة بلا نشر: يوم يُفتح حساب تاجر يُلصق رابط الدفع فيظهر زره،
   وقبل ذلك يبقى الزر مخفياً ويكفي زر واتساب.
   ========================================================================== */

-- رابط الدفع الإلكتروني (Moyasar / Tap / غيرهما). فارغ = الزر مخفي.
insert into public.app_settings (key, value)
values ('pay_link', '')
on conflict (key) do nothing;

-- رقم واتساب المنصة للتجديد والدعم، بصيغة دولية بلا +
insert into public.app_settings (key, value)
values ('support_wa', '966545067767')
on conflict (key) do nothing;

select key, value from public.app_settings where key in ('pay_link','support_wa') order by key;
