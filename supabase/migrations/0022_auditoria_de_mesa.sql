-- Tiny Cats · a auditoria de mesa (lote 27)
-- O administrador do site entra numa mesa de que não participa, sem aparecer: não vira participante (não há linha em
-- mesa_membros, então ninguém o vê na lista nem online). Quem dá a entrada é a função "admin" (supabase/functions/admin):
-- ela grava aqui uma sessão de auditoria — a mesa, o modo ('ver': só olhar; 'mestre': mexer como mestre) e até quando
-- vale — e anota no registro da administração. Enquanto a sessão vale, as quatro perguntas que as regras de acesso
-- fazem (é participante? é o mestre? mestra esta aba? está mestrando?) respondem sim para ele, naquela mesa só.
-- O modo 'ver' é cumprido pelo site (ele não grava nada); o banco trata os dois modos igual.

create table if not exists public.admin_auditoria (
  admin_id uuid not null references auth.users(id) on delete cascade,
  mesa_id uuid not null references public.mesas(id) on delete cascade,
  modo text not null check (modo in ('ver', 'mestre')),
  ate timestamptz not null,
  primary key (admin_id, mesa_id)
);
alter table public.admin_auditoria enable row level security;     -- sem regra: só a função (chave de serviço) mexe

create or replace function privado.auditando(m uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (
    select 1 from public.admin_auditoria a join public.admins x on x.usuario_id = a.admin_id
     where a.mesa_id = m and a.admin_id = (select auth.uid()) and a.ate > now());
$$;

create or replace function privado.e_membro(m uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.mesa_membros mm where mm.mesa_id = m and mm.usuario_id = (select auth.uid()))
      or privado.auditando(m);
$$;

create or replace function privado.e_mestre(m uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.mesa_membros mm where mm.mesa_id = m and mm.usuario_id = (select auth.uid()) and mm.papel = 'mestre')
      or privado.auditando(m);
$$;

create or replace function privado.mestra(m uuid, aba text)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (
    select 1 from public.mesa_membros mm
     where mm.mesa_id = m and mm.usuario_id = (select auth.uid())
       and (mm.papel = 'mestre' or (mm.papel = 'auxiliar' and not mm.jogando and aba = any (mm.abas))))
      or privado.auditando(m);
$$;

create or replace function privado.mestrando(m uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (
    select 1 from public.mesa_membros mm
     where mm.mesa_id = m and mm.usuario_id = (select auth.uid())
       and (mm.papel = 'mestre' or (mm.papel = 'auxiliar' and not mm.jogando)))
      or privado.auditando(m);
$$;
