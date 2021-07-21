-- Deploy fresh database tables

--    \i => used to execute scripts

\i '/docker-entrypoint-initdb.d/tables/users.sql'
\i '/docker-entrypoint-initdb.d/tables/login.sql'