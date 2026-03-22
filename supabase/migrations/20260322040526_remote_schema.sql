drop extension if exists "pg_net";


  create table "public"."assignments" (
    "id" uuid not null default gen_random_uuid(),
    "task_id" uuid not null,
    "member_id" uuid not null,
    "state" text not null default 'assigned'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."assignments" enable row level security;


  create table "public"."availability_rules" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "days" integer[] not null,
    "start_time" time without time zone not null,
    "end_time" time without time zone not null,
    "timezone" text not null default 'America/Toronto'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."availability_rules" enable row level security;


  create table "public"."availability_slots" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "start_ts" timestamp with time zone not null,
    "end_ts" timestamp with time zone not null
      );


alter table "public"."availability_slots" enable row level security;


  create table "public"."messages" (
    "id" uuid not null default gen_random_uuid(),
    "sender_id" uuid not null,
    "receiver_id" uuid not null,
    "body" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."messages" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "role" text not null default 'member'::text,
    "sailing_level" integer not null default 0,
    "ability_notes" text,
    "email" text
      );


alter table "public"."profiles" enable row level security;


  create table "public"."swipes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "task_id" uuid not null,
    "decision" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."swipes" enable row level security;


  create table "public"."tasks" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "window_start" timestamp with time zone not null,
    "window_end" timestamp with time zone not null,
    "required_level" integer not null default 0,
    "needed_volunteers" integer not null default 1,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "location" text,
    "duration_minutes" integer,
    "category" text
      );


alter table "public"."tasks" enable row level security;

CREATE UNIQUE INDEX assignments_pkey ON public.assignments USING btree (id);

CREATE UNIQUE INDEX assignments_task_id_member_id_key ON public.assignments USING btree (task_id, member_id);

CREATE UNIQUE INDEX availability_rules_pkey ON public.availability_rules USING btree (id);

CREATE UNIQUE INDEX availability_slots_pkey ON public.availability_slots USING btree (id);

CREATE INDEX idx_assignments_task ON public.assignments USING btree (task_id);

CREATE INDEX idx_availability_rules_user ON public.availability_rules USING btree (user_id);

CREATE INDEX idx_availability_user ON public.availability_slots USING btree (user_id);

CREATE INDEX idx_messages_receiver_created ON public.messages USING btree (receiver_id, created_at);

CREATE INDEX idx_messages_sender_created ON public.messages USING btree (sender_id, created_at);

CREATE INDEX idx_swipes_user ON public.swipes USING btree (user_id);

CREATE INDEX idx_tasks_window ON public.tasks USING btree (window_start, window_end);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX swipes_pkey ON public.swipes USING btree (id);

CREATE UNIQUE INDEX swipes_user_id_task_id_key ON public.swipes USING btree (user_id, task_id);

CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id);

alter table "public"."assignments" add constraint "assignments_pkey" PRIMARY KEY using index "assignments_pkey";

alter table "public"."availability_rules" add constraint "availability_rules_pkey" PRIMARY KEY using index "availability_rules_pkey";

alter table "public"."availability_slots" add constraint "availability_slots_pkey" PRIMARY KEY using index "availability_slots_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."swipes" add constraint "swipes_pkey" PRIMARY KEY using index "swipes_pkey";

alter table "public"."tasks" add constraint "tasks_pkey" PRIMARY KEY using index "tasks_pkey";

alter table "public"."assignments" add constraint "assignments_member_id_fkey" FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."assignments" validate constraint "assignments_member_id_fkey";

alter table "public"."assignments" add constraint "assignments_state_check" CHECK ((state = ANY (ARRAY['assigned'::text, 'completed'::text]))) not valid;

alter table "public"."assignments" validate constraint "assignments_state_check";

alter table "public"."assignments" add constraint "assignments_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE not valid;

alter table "public"."assignments" validate constraint "assignments_task_id_fkey";

alter table "public"."assignments" add constraint "assignments_task_id_member_id_key" UNIQUE using index "assignments_task_id_member_id_key";

alter table "public"."availability_rules" add constraint "availability_rules_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."availability_rules" validate constraint "availability_rules_user_id_fkey";

alter table "public"."availability_rules" add constraint "rule_days_nonempty" CHECK (((array_length(days, 1) IS NOT NULL) AND (array_length(days, 1) > 0))) not valid;

alter table "public"."availability_rules" validate constraint "rule_days_nonempty";

alter table "public"."availability_rules" add constraint "rule_end_after_start" CHECK ((end_time > start_time)) not valid;

alter table "public"."availability_rules" validate constraint "rule_end_after_start";

alter table "public"."availability_slots" add constraint "availability_end_after_start" CHECK ((end_ts > start_ts)) not valid;

alter table "public"."availability_slots" validate constraint "availability_end_after_start";

alter table "public"."availability_slots" add constraint "availability_slots_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."availability_slots" validate constraint "availability_slots_user_id_fkey";

alter table "public"."messages" add constraint "messages_body_check" CHECK ((length(TRIM(BOTH FROM body)) > 0)) not valid;

alter table "public"."messages" validate constraint "messages_body_check";

alter table "public"."messages" add constraint "messages_receiver_id_fkey" FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_receiver_id_fkey";

alter table "public"."messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_sender_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['member'::text, 'director'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."swipes" add constraint "swipes_decision_check" CHECK ((decision = ANY (ARRAY['accepted'::text, 'rejected'::text]))) not valid;

alter table "public"."swipes" validate constraint "swipes_decision_check";

alter table "public"."swipes" add constraint "swipes_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE not valid;

alter table "public"."swipes" validate constraint "swipes_task_id_fkey";

alter table "public"."swipes" add constraint "swipes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."swipes" validate constraint "swipes_user_id_fkey";

alter table "public"."swipes" add constraint "swipes_user_id_task_id_key" UNIQUE using index "swipes_user_id_task_id_key";

alter table "public"."tasks" add constraint "task_end_after_start" CHECK ((window_end > window_start)) not valid;

alter table "public"."tasks" validate constraint "task_end_after_start";

alter table "public"."tasks" add constraint "tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."tasks" validate constraint "tasks_created_by_fkey";

alter table "public"."tasks" add constraint "tasks_duration_minutes_check" CHECK (((duration_minutes IS NULL) OR (duration_minutes > 0))) not valid;

alter table "public"."tasks" validate constraint "tasks_duration_minutes_check";

alter table "public"."tasks" add constraint "tasks_needed_volunteers_check" CHECK ((needed_volunteers >= 1)) not valid;

alter table "public"."tasks" validate constraint "tasks_needed_volunteers_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.accept_task(p_task_id uuid)
 RETURNS TABLE(assigned boolean, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_needed int;
  v_assigned_count int;
begin
  if v_user_id is null then
    return query select false, 'not_authenticated';
    return;
  end if;

  -- record swipe (idempotent)
  insert into public.swipes (user_id, task_id, decision)
  values (v_user_id, p_task_id, 'accepted')
  on conflict (user_id, task_id) do update
    set decision = excluded.decision;

  select needed_volunteers into v_needed
  from public.tasks
  where id = p_task_id;

  if v_needed is null then
    return query select false, 'task_not_found';
    return;
  end if;

  select count(*) into v_assigned_count
  from public.assignments
  where task_id = p_task_id and state = 'assigned';

  if v_assigned_count >= v_needed then
    return query select false, 'task_full';
    return;
  end if;

  insert into public.assignments (task_id, member_id, state)
  values (p_task_id, v_user_id, 'assigned')
  on conflict (task_id, member_id) do nothing;

  return query select true, 'assigned';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_next_task(p_user_id uuid)
 RETURNS public.tasks
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  -- prevent calling for someone else
  select *
  from public.tasks t
  where p_user_id = auth.uid()
    and exists (select 1 from public.profiles me where me.id = p_user_id)
    and t.required_level <= (select sailing_level from public.profiles me where me.id = p_user_id)
    and not exists (
      select 1
      from public.swipes s
      where s.user_id = p_user_id and s.task_id = t.id
    )
    and (
      exists (
        select 1
        from public.availability_slots a
        where a.user_id = p_user_id
          and a.start_ts < t.window_end
          and a.end_ts > t.window_start
      )
      or exists (
        select 1
        from public.availability_rules r
        where r.user_id = p_user_id
          and extract(dow from (t.window_start at time zone r.timezone))::int = any (r.days)
          and (t.window_start at time zone r.timezone)::time < r.end_time
          and (t.window_end   at time zone r.timezone)::time > r.start_time
      )
    )
    and (
      select count(*)
      from public.assignments x
      where x.task_id = t.id and x.state = 'assigned'
    ) < t.needed_volunteers
  order by t.window_start asc, t.created_at asc
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_rejected_available_tasks()
 RETURNS TABLE(id uuid, created_at timestamp with time zone, task_id uuid, title text, description text, location text, category text, duration_minutes integer, window_start timestamp with time zone, window_end timestamp with time zone, required_level integer, needed_volunteers integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    s.id,
    s.created_at,
    t.id as task_id,
    t.title,
    t.description,
    t.location,
    t.category,
    t.duration_minutes,
    t.window_start,
    t.window_end,
    t.required_level,
    t.needed_volunteers
  from public.swipes s
  join public.tasks t on t.id = s.task_id
  where s.user_id = auth.uid()
    and s.decision = 'rejected'
    and (
      select count(*)
      from public.assignments a
      where a.task_id = t.id
        and a.state = 'assigned'
    ) < t.needed_volunteers
  order by s.created_at desc;
$function$
;

CREATE OR REPLACE FUNCTION public.get_task_progress(p_user_id uuid)
 RETURNS TABLE(current integer, total integer, remaining integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with me as (
    select id, sailing_level
    from public.profiles
    where id = p_user_id
  ),
  eligible_all as (
    select t.id
    from public.tasks t
    join me on true
    where t.required_level <= me.sailing_level
      and exists (
        select 1
        from public.availability_slots a
        where a.user_id = me.id
          and a.start_ts < t.window_end
          and a.end_ts > t.window_start
      )
      and (
        select count(*)
        from public.assignments x
        where x.task_id = t.id and x.state = 'assigned'
      ) < t.needed_volunteers
  ),
  remaining_ids as (
    select e.id
    from eligible_all e
    join me on true
    where not exists (
      select 1 from public.swipes s
      where s.user_id = me.id and s.task_id = e.id
    )
  )
  select
    greatest(1, (select count(*) from eligible_all) - (select count(*) from remaining_ids) + 1) as current,
    (select count(*) from eligible_all) as total,
    (select count(*) from remaining_ids) as remaining;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, role, email)
  values (new.id, 'member', new.email)
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_director()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'director'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.reject_task(p_task_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.swipes (user_id, task_id, decision)
  values (auth.uid(), p_task_id, 'rejected')
  on conflict (user_id, task_id) do update
    set decision = excluded.decision;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.unassign_task(p_task_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or p_task_id is null then
    return;
  end if;

  -- remove the assignment (free up a slot)
  delete from public.assignments
  where task_id = p_task_id
    and member_id = v_user_id
    and state = 'assigned';

  -- allow the task to be swiped again by this member
  delete from public.swipes
  where task_id = p_task_id
    and user_id = v_user_id;
end;
$function$
;

grant delete on table "public"."assignments" to "anon";

grant insert on table "public"."assignments" to "anon";

grant references on table "public"."assignments" to "anon";

grant select on table "public"."assignments" to "anon";

grant trigger on table "public"."assignments" to "anon";

grant truncate on table "public"."assignments" to "anon";

grant update on table "public"."assignments" to "anon";

grant delete on table "public"."assignments" to "authenticated";

grant insert on table "public"."assignments" to "authenticated";

grant references on table "public"."assignments" to "authenticated";

grant select on table "public"."assignments" to "authenticated";

grant trigger on table "public"."assignments" to "authenticated";

grant truncate on table "public"."assignments" to "authenticated";

grant update on table "public"."assignments" to "authenticated";

grant delete on table "public"."assignments" to "service_role";

grant insert on table "public"."assignments" to "service_role";

grant references on table "public"."assignments" to "service_role";

grant select on table "public"."assignments" to "service_role";

grant trigger on table "public"."assignments" to "service_role";

grant truncate on table "public"."assignments" to "service_role";

grant update on table "public"."assignments" to "service_role";

grant delete on table "public"."availability_rules" to "anon";

grant insert on table "public"."availability_rules" to "anon";

grant references on table "public"."availability_rules" to "anon";

grant select on table "public"."availability_rules" to "anon";

grant trigger on table "public"."availability_rules" to "anon";

grant truncate on table "public"."availability_rules" to "anon";

grant update on table "public"."availability_rules" to "anon";

grant delete on table "public"."availability_rules" to "authenticated";

grant insert on table "public"."availability_rules" to "authenticated";

grant references on table "public"."availability_rules" to "authenticated";

grant select on table "public"."availability_rules" to "authenticated";

grant trigger on table "public"."availability_rules" to "authenticated";

grant truncate on table "public"."availability_rules" to "authenticated";

grant update on table "public"."availability_rules" to "authenticated";

grant delete on table "public"."availability_rules" to "service_role";

grant insert on table "public"."availability_rules" to "service_role";

grant references on table "public"."availability_rules" to "service_role";

grant select on table "public"."availability_rules" to "service_role";

grant trigger on table "public"."availability_rules" to "service_role";

grant truncate on table "public"."availability_rules" to "service_role";

grant update on table "public"."availability_rules" to "service_role";

grant delete on table "public"."availability_slots" to "anon";

grant insert on table "public"."availability_slots" to "anon";

grant references on table "public"."availability_slots" to "anon";

grant select on table "public"."availability_slots" to "anon";

grant trigger on table "public"."availability_slots" to "anon";

grant truncate on table "public"."availability_slots" to "anon";

grant update on table "public"."availability_slots" to "anon";

grant delete on table "public"."availability_slots" to "authenticated";

grant insert on table "public"."availability_slots" to "authenticated";

grant references on table "public"."availability_slots" to "authenticated";

grant select on table "public"."availability_slots" to "authenticated";

grant trigger on table "public"."availability_slots" to "authenticated";

grant truncate on table "public"."availability_slots" to "authenticated";

grant update on table "public"."availability_slots" to "authenticated";

grant delete on table "public"."availability_slots" to "service_role";

grant insert on table "public"."availability_slots" to "service_role";

grant references on table "public"."availability_slots" to "service_role";

grant select on table "public"."availability_slots" to "service_role";

grant trigger on table "public"."availability_slots" to "service_role";

grant truncate on table "public"."availability_slots" to "service_role";

grant update on table "public"."availability_slots" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."swipes" to "anon";

grant insert on table "public"."swipes" to "anon";

grant references on table "public"."swipes" to "anon";

grant select on table "public"."swipes" to "anon";

grant trigger on table "public"."swipes" to "anon";

grant truncate on table "public"."swipes" to "anon";

grant update on table "public"."swipes" to "anon";

grant delete on table "public"."swipes" to "authenticated";

grant insert on table "public"."swipes" to "authenticated";

grant references on table "public"."swipes" to "authenticated";

grant select on table "public"."swipes" to "authenticated";

grant trigger on table "public"."swipes" to "authenticated";

grant truncate on table "public"."swipes" to "authenticated";

grant update on table "public"."swipes" to "authenticated";

grant delete on table "public"."swipes" to "service_role";

grant insert on table "public"."swipes" to "service_role";

grant references on table "public"."swipes" to "service_role";

grant select on table "public"."swipes" to "service_role";

grant trigger on table "public"."swipes" to "service_role";

grant truncate on table "public"."swipes" to "service_role";

grant update on table "public"."swipes" to "service_role";

grant delete on table "public"."tasks" to "anon";

grant insert on table "public"."tasks" to "anon";

grant references on table "public"."tasks" to "anon";

grant select on table "public"."tasks" to "anon";

grant trigger on table "public"."tasks" to "anon";

grant truncate on table "public"."tasks" to "anon";

grant update on table "public"."tasks" to "anon";

grant delete on table "public"."tasks" to "authenticated";

grant insert on table "public"."tasks" to "authenticated";

grant references on table "public"."tasks" to "authenticated";

grant select on table "public"."tasks" to "authenticated";

grant trigger on table "public"."tasks" to "authenticated";

grant truncate on table "public"."tasks" to "authenticated";

grant update on table "public"."tasks" to "authenticated";

grant delete on table "public"."tasks" to "service_role";

grant insert on table "public"."tasks" to "service_role";

grant references on table "public"."tasks" to "service_role";

grant select on table "public"."tasks" to "service_role";

grant trigger on table "public"."tasks" to "service_role";

grant truncate on table "public"."tasks" to "service_role";

grant update on table "public"."tasks" to "service_role";


  create policy "assignments_select_all_director"
  on "public"."assignments"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'director'::text)))));



  create policy "assignments_select_own"
  on "public"."assignments"
  as permissive
  for select
  to public
using ((member_id = auth.uid()));



  create policy "assignments_update_director"
  on "public"."assignments"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'director'::text)))));



  create policy "availability_rules_crud_own"
  on "public"."availability_rules"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "availability_crud_own"
  on "public"."availability_slots"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "messages_insert_sender_only"
  on "public"."messages"
  as permissive
  for insert
  to public
with check (((sender_id = auth.uid()) AND (receiver_id IS NOT NULL) AND (length(TRIM(BOTH FROM body)) > 0)));



  create policy "messages_select_participants"
  on "public"."messages"
  as permissive
  for select
  to public
using (((sender_id = auth.uid()) OR (receiver_id = auth.uid())));



  create policy "profiles_select_all_authenticated"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() IS NOT NULL));



  create policy "profiles_select_own"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((id = auth.uid()));



  create policy "profiles_update_own"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((id = auth.uid()));



  create policy "swipes_insert_own"
  on "public"."swipes"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "swipes_select_own"
  on "public"."swipes"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "tasks_delete_director"
  on "public"."tasks"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'director'::text)))));



  create policy "tasks_select_all"
  on "public"."tasks"
  as permissive
  for select
  to public
using (true);



  create policy "tasks_update_director"
  on "public"."tasks"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'director'::text)))));



  create policy "tasks_write_director"
  on "public"."tasks"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'director'::text)))));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


