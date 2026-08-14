-- Run this in the Supabase SQL editor after creating the `photos` table
-- and the `increment_likes` function.

-- Row Level Security on the photos table
alter table photos enable row level security;

create policy "Anyone can read photos"
on photos for select
using (true);

create policy "Anyone can add a photo"
on photos for insert
with check (likes = 0);

-- No direct UPDATE/DELETE policies: likes can only change through the
-- increment_likes() function (security definer), and nothing can delete rows.
grant execute on function increment_likes(uuid, int) to anon;

-- Include the table in the realtime publication so subscribeToPhotos() gets
-- live inserts/updates.
alter publication supabase_realtime add table photos;

-- Storage bucket for the actual photo files
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "Public read access to photos bucket"
on storage.objects for select
using (bucket_id = 'photos');

create policy "Anyone can upload to photos bucket"
on storage.objects for insert
with check (bucket_id = 'photos');
