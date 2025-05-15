-- Copyright (C) 2022 - present Juergen Zimmermann, Hochschule Karlsruhe
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with this program.  If not, see <https://www.gnu.org/licenses/>.

-- docker compose exec postgres bash
-- psql --dbname=auto --username=auto --file=/scripts/create-table-auto.sql

-- text statt varchar(n):
-- "There is no performance difference among these three types, apart from a few extra CPU cycles
-- to check the length when storing into a length-constrained column"
-- ggf. CHECK(char_length(nachname) <= 255)

-- Indexe mit pgAdmin auflisten: "Query Tool" verwenden mit
--  SELECT   tablename, indexname, indexdef, tablespace
--  FROM     pg_indexes
--  WHERE    schemaname = 'auto'
--  ORDER BY tablename, indexname;

-- https://www.postgresql.org/docs/devel/app-psql.html
-- https://www.postgresql.org/docs/current/ddl-schemas.html
-- https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-CREATE
-- "user-private schema" (Default-Schema: public)
CREATE SCHEMA IF NOT EXISTS AUTHORIZATION auto;

ALTER ROLE auto SET search_path = 'auto';

-- Enum korrekt definieren
--CREATE TYPE autoart AS ENUM ('Limousine', 'Cabrio', 'SUV', 'Kleinwagen', 'Sportwagen');

CREATE TABLE IF NOT EXISTS auto (
    id                  integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE autospace,
    version             integer NOT NULL DEFAULT 0,
    fahrgestellnummer   text NOT NULL UNIQUE USING INDEX TABLESPACE autospace,
    ps                 integer NOT NULL CHECK (ps > 0),
    art                ENUM ('Limousine', 'Cabrio', 'SUV', 'Kleinwagen', 'Sportwagen');
    preis              decimal(8,2) NOT NULL,
    rabatt             decimal(4,3) NOT NULL CHECK (rabatt >= 0 AND rabatt <= 1),
    lieferbar          boolean NOT NULL DEFAULT FALSE,
    datum             date,
    homepage          text,
    schlagwoerter     text, -- bei Bedarf in text[] oder json ändern
    erzeugt           timestamp NOT NULL DEFAULT NOW(),
    aktualisiert      timestamp NOT NULL DEFAULT NOW()
) TABLESPACE autospace;

CREATE TABLE IF NOT EXISTS modell (
    id          integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE autospace,
    modell      text NOT NULL,
    untertitel  text,
    auto_id     integer NOT NULL UNIQUE USING INDEX TABLESPACE autospace REFERENCES auto(id) ON DELETE CASCADE
) TABLESPACE autospace;

CREATE TABLE IF NOT EXISTS abbildung (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE autospace,
    beschriftung    text NOT NULL,
    content_type    text NOT NULL,
    auto_id         integer NOT NULL REFERENCES auto(id) ON DELETE CASCADE
) TABLESPACE autospace;
CREATE INDEX IF NOT EXISTS abbildung_auto_id_idx ON abbildung(auto_id) TABLESPACE autospace;

CREATE TABLE IF NOT EXISTS auto_file (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE autospace,
    data            bytea NOT NULL,
    filename        text NOT NULL,
    mimetype        text,
    auto_id         integer NOT NULL REFERENCES auto(id) ON DELETE CASCADE
) TABLESPACE autospace;
CREATE INDEX IF NOT EXISTS auto_file_auto_id_idx ON auto_file(auto_id) TABLESPACE autospace;
