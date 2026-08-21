SELECT cron.schedule(
  'process-activity-reminders-every-minute',
  '* * * * *',
  $$
  select
    net.http_post(
      url:='https://nglwgzknqgihlbkdnflu.supabase.co/functions/v1/process-activity-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) as request_id;
  $$
);