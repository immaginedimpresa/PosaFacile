-- Un ordine annullato dal cliente non è un ordine rimborsato: serve uno stato proprio.
-- Il frontend lo usa già (CustomerDashboard), ma l'enum non lo prevedeva e
-- l'annullamento falliva con 22P02 "invalid input value for enum order_status".
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled';
