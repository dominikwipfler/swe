-- Copyright (C) 2023 - present Juergen Zimmermann, Hochschule Karlsruhe
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

-- "Konzeption und Realisierung eines aktiven Datenbanksystems"
-- "Verteilte Komponenten und Datenbankanbindung"
-- "Design Patterns"
-- "Freiburger Chorauto"
-- "Maschinelle Lernverfahren zur Behandlung von Bonitätsrisiken im Mobilfunkgeschäft"
-- "Software Pioneers"
INSERT INTO auto (id, fahrgestellnummer, ps, art, preis, rabatt, lieferbar, datum, homepage, schlagwoerter)
VALUES
(1, 'WVWZZZ1JZXW000001', 150, 'Limousine', 25999.99, 0.050, true, '2024-05-10', 'https://limousine1.example.com', 'komfort'),
(20, 'WVWZZZ1JZXW000002', 120, 'Kleinwagen', 17999.99, 0.100, false, '2024-04-22', 'https://kleinwagen1.example.com', 'sparsam'),
(30, 'WVWZZZ1JZXW000003', 310, 'SUV', 49999.99, 0.080, true, '2023-11-15', 'https://suv1.example.com', 'familienfreundlich'),
(40, 'WVWZZZ1JZXW000004', 220, 'Cabrio', 38999.00, 0.075, false, '2024-03-01', 'https://cabrio1.example.com', 'luxus'),
(50, 'WVWZZZ1JZXW000005', 400, 'Sportwagen', 79999.99, 0.120, true, '2024-01-20', 'https://sportwagen1.example.com', 'design'),
(60, 'WVWZZZ1JZXW000006', 180, 'Limousine', 26999.00, 0.060, true, '2024-02-10', 'https://limousine2.example.com', 'business'),
(70, 'WVWZZZ1JZXW000007', 95, 'Kleinwagen', 15999.00, 0.150, false, '2024-03-20', 'https://kleinwagen2.example.com', 'kompakt'),
(80, 'WVWZZZ1JZXW000008', 260, 'SUV', 42999.99, 0.090, true, '2024-05-05', 'https://suv2.example.com', 'komfort');


INSERT INTO modell (id, modell, untertitel, auto_id)
VALUES
(1, 'Elegance LX', 'Die komfortable Limousine', 1),
(20, 'CityGo', 'Klein, aber oho', 20),
(30, 'Adventure X', 'Bereit für jedes Terrain', 30),
(40, 'SkyRide', 'Offen für Freiheit', 40),
(50, 'Speedster Pro', 'Maximale Performance', 50),
(60, 'Executive Plus', 'Für Geschäftsreisen ideal', 60),
(70, 'MiniFlex', 'Perfekt für die Stadt', 70),
(80, 'FamilyDrive', 'Für die ganze Familie', 80);


INSERT INTO abbildung(id, beschriftung, content_type, auto_id) VALUES
    (1, 'Abb. 1', 'img/png', 1),
    (20, 'Abb. 1', 'img/png', 20),
    (21, 'Abb. 2', 'img/png', 20),
    (30, 'Abb. 1', 'img/png', 30),
    (31, 'Abb. 2', 'img/png', 30),
    (40, 'Abb. 1', 'img/png', 40),
    (50, 'Abb. 1', 'img/png', 50),
    (60, 'Abb. 1', 'img/png', 60);
