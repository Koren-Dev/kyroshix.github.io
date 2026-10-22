-- Additive migration: allow owner-published HTTPS audio URLs while retaining
-- owner authorization, cover validation, storage ownership and all existing fields.
create or replace function public.krs_save_track(p_track jsonb) returns public.krs_tracks
language plpgsql security definer set search_path = '' as $$
declare result public.krs_tracks; ident text; ap text; cp text;
begin
 if not public.krs_is_owner() then raise exception 'Somente o dono pode gerenciar músicas.'; end if;
 ident:=p_track->>'id'; ap:=p_track->>'audio_path'; cp:=coalesce(p_track->>'cover_path','');
 if exists(select 1 from public.krs_tracks where id=ident and kind='video') then raise exception 'Arquivo pertence a um vídeo. Use o editor de vídeos.'; end if;
 if coalesce((p_track->>'byte_size')::bigint,0) not between 0 and 52428800 then raise exception 'Arquivo de áudio deve ter até 50 MB.'; end if;
 if ap is null or char_length(ap)>2048 or (ap not in ('assets/remember.mp3','assets/legends.mp3','assets/darkness.mp3','assets/blindfold.mp3')
 and ap !~ '^tracks/[a-z0-9-]+/[a-z0-9-]+[.](mp3|flac|wav|m4a|ogg)$'
 and (ap !~* '^https://([a-z0-9-]+[.])+[a-z]{2,63}(:443)?/[^[:space:]]*$' or ap ~* '^https://(localhost|[^/]+[.](localhost|local|internal))(:443)?/')) then raise exception 'Informe um arquivo de áudio ou um link HTTPS público válido.'; end if;
 if cp<>'' and cp !~ '^tracks/[a-z0-9-]+/[a-z0-9-]+[.]webp$' then raise exception 'Capa inválida.'; end if;
 if ap like 'tracks/%' and not exists(select 1 from storage.objects where bucket_id='kyroshix-media' and name=ap) then raise exception 'Envie o áudio antes de publicar.'; end if;
 if cp<>'' and not exists(select 1 from storage.objects where bucket_id='kyroshix-media' and name=cp) then raise exception 'Envie a capa antes de publicar.'; end if;
 insert into public.krs_tracks(id,title,artists,remix,description,credits,tags,duration,audio_path,cover_path,legacy_cover,featured,byte_size)
 values(ident,trim(p_track->>'title'),trim(p_track->>'artists'),coalesce(p_track->>'remix','Remix'),coalesce(p_track->>'description',''),coalesce(p_track->>'credits',''),array(select jsonb_array_elements_text(p_track->'tags')),coalesce((p_track->>'duration')::numeric,0),ap,cp,coalesce(p_track->>'legacy_cover',''),coalesce((p_track->>'featured')::boolean,false),coalesce((p_track->>'byte_size')::bigint,0))
 on conflict(id) do update set title=excluded.title,artists=excluded.artists,remix=excluded.remix,description=excluded.description,credits=excluded.credits,tags=excluded.tags,duration=excluded.duration,audio_path=excluded.audio_path,cover_path=excluded.cover_path,legacy_cover=excluded.legacy_cover,featured=excluded.featured,byte_size=excluded.byte_size,updated_at=now()
 returning * into result; return result;
end $$;
