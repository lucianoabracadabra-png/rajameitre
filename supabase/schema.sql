-- =====================================================================
-- GarçON · BH Raja Hotel — estrutura do banco no Supabase
-- Cole este arquivo inteiro em: Supabase > SQL Editor > New query > Run
-- Pode rodar de novo sem problema (não duplica nada).
-- =====================================================================

-- 1) TABELAS ----------------------------------------------------------
-- app_state: guarda o Acervo Mestre ('master_database') e o evento ativo
-- ('event_config'), cada um como um documento JSON.
create table if not exists public.app_state (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- orders: uma linha por comanda emitida pelos convidados.
create table if not exists public.orders (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- 2) SEGURANÇA (RLS) --------------------------------------------------
-- Permite operações de leitura e gravação para sincronização direta do painel
alter table public.app_state enable row level security;
alter table public.orders    enable row level security;

drop policy if exists "equipe_app_state" on public.app_state;
drop policy if exists "anon_app_state" on public.app_state;
create policy "anon_app_state" on public.app_state
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "equipe_orders" on public.orders;
drop policy if exists "anon_orders" on public.orders;
create policy "anon_orders" on public.orders
  for all to anon, authenticated using (true) with check (true);

-- 3) FUNÇÕES PARA O CONVIDADO ----------------------------------------
-- O convidado (sem login) só consegue duas coisas, e só por aqui:

-- 3a) Ver o evento ativo, SEM a senha do evento.
create or replace function public.get_public_event()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select value - 'accessCode'
  from public.app_state
  where key = 'event_config';
$$;

-- 3b) Emitir uma comanda. A senha do evento é conferida aqui no servidor.
create or replace function public.submit_order(p_order jsonb, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  select value ->> 'accessCode' into v_code
  from public.app_state
  where key = 'event_config';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_event');
  end if;

  if coalesce(v_code, '') <> ''
     and upper(trim(coalesce(p_code, ''))) <> upper(trim(v_code)) then
    return jsonb_build_object('ok', false, 'error', 'bad_code');
  end if;

  if p_order is null
     or coalesce(p_order ->> 'id', '') = ''
     or length(p_order::text) > 20000 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  insert into public.orders (id, data)
  values (p_order ->> 'id', p_order)
  on conflict (id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.get_public_event()            from public;
revoke all on function public.submit_order(jsonb, text)     from public;
grant execute on function public.get_public_event()         to anon, authenticated;
grant execute on function public.submit_order(jsonb, text)  to anon, authenticated;
