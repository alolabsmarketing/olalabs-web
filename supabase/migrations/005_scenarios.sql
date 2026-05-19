create table if not exists public.scenarios (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  category        text not null check (category in ('travel','work','daily','education','social')),
  icon            text not null,
  title_en        text not null,
  title_tr        text not null,
  description_en  text not null,
  description_tr  text not null,
  practice_language text not null default 'en',
  min_plan        text not null default 'free' check (min_plan in ('free','pro','premium')),
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.scenarios enable row level security;
create policy "scenarios are public read" on public.scenarios for select using (true);

insert into public.scenarios
  (slug, category, icon, title_en, title_tr, description_en, description_tr, min_plan, sort_order)
values
  ('visa-interview',     'travel',    '✈️', 'Visa Interview',           'Vize Mülakatı',         'Practice for your embassy visa interview',          'Büyükelçilik vize mülakatına hazırlan',        'free', 1),
  ('restaurant-order',   'daily',     '🍽️', 'Ordering at a Restaurant', 'Restoranda Sipariş',    'Order food, ask questions, handle the bill',       'Yemek sipariş et, soru sor, hesap öde',        'free', 2),
  ('asking-directions',  'daily',     '🗺️', 'Asking for Directions',    'Yol Tarifi Sorma',      'Navigate an unfamiliar city with confidence',      'Yabancı bir şehirde güvenle yol bul',          'free', 3),
  ('job-interview',      'work',      '💼', 'Job Interview',            'İş Mülakatı',           'Ace your next job interview in English',           'İngilizce iş mülakatında başarılı ol',         'pro',  4),
  ('doctor-appointment', 'daily',     '🏥', 'Doctor Appointment',       'Doktor Randevusu',      'Describe symptoms and ask about treatment',        'Belirtileri anlat, tedavi hakkında sor',        'pro',  5),
  ('hotel-checkin',      'travel',    '🏨', 'Hotel Check-in',           'Otel Check-in',         'Check in, make requests, handle problems',         'Check-in yap, istek belirt, sorunları çöz',    'pro',  6),
  ('shopping',           'daily',     '🛍️', 'Shopping',                 'Alışveriş',             'Browse, ask about sizes and prices, buy items',   'Gez, beden/fiyat sor, satın al',               'pro',  7),
  ('business-meeting',   'work',      '📊', 'Business Meeting',         'İş Toplantısı',         'Lead or participate in a professional meeting',    'İş toplantısına önder veya katılımcı ol',      'pro',  8),
  ('airport-checkin',    'travel',    '🛫', 'Airport Check-in',         'Havaalanı Check-in',    'Navigate check-in, security, and boarding',        'Check-in, güvenlik ve biniş süreçlerini geç',  'pro',  9),
  ('university-campus',  'education', '🎓', 'University Campus',        'Üniversite Kampüsü',    'Ask about courses, registration, campus life',     'Dersler, kayıt ve kampüs hayatı hakkında sor', 'pro', 10),
  ('making-friends',     'social',    '👋', 'Making Friends',           'Arkadaş Edinme',        'Start conversations and build new connections',    'Sohbet başlat ve yeni bağlantılar kur',        'pro', 11),
  ('phone-call',         'daily',     '📞', 'Phone Call',               'Telefon Görüşmesi',     'Handle a formal or informal phone call',           'Resmi veya samimi bir telefon görüşmesi yap',  'pro', 12),
  ('work-presentation',  'work',      '🎤', 'Work Presentation',        'İş Sunumu',             'Present your ideas clearly and handle Q&A',       'Fikirlerini net sun ve soruları yanıtla',       'pro', 13),
  ('negotiating',        'work',      '🤝', 'Negotiating a Deal',       'Anlaşma Müzakeresi',    'Negotiate prices, terms, or contracts',            'Fiyat, şart veya sözleşme müzakere et',        'pro', 14),
  ('bank-visit',         'daily',     '🏦', 'Bank Visit',               'Banka Ziyareti',        'Open an account and ask about services',           'Hesap aç, hizmetler hakkında sor',             'pro', 15),
  ('emergency',          'daily',     '🚨', 'Emergency Situation',      'Acil Durum',            'Handle urgent situations clearly and calmly',      'Acil durumları net ve sakin yönet',            'pro', 16),
  ('taxi-ride',          'travel',    '🚕', 'Taxi Ride',                'Taksi Yolculuğu',       'Give directions, make small talk, pay',            'Yön ver, sohbet et, öde',                      'pro', 17),
  ('classroom',          'education', '📚', 'Classroom Discussion',     'Sınıf Tartışması',      'Participate in class, ask and answer questions',   'Derse katıl, soru sor ve yanıtla',             'pro', 18),
  ('party',              'social',    '🎉', 'Party Conversation',       'Parti Sohbeti',         'Mingle and make small talk at a social event',     'Sosyal etkinlikte sohbet et',                  'pro', 19),
  ('talking-sports',     'social',    '⚽', 'Talking About Sports',     'Spor Hakkında Konuşma', 'Discuss your favorite sport, team, and matches',   'Favori spor, takım ve maçları konuş',          'pro', 20);
