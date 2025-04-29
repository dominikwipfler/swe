// Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

/**
 * Das Modul besteht aus der Klasse {@linkcode QueryBuilder}.
 * @packageDocumentation
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { typeOrmModuleOptions } from '../../config/typeormOptions.js';
import { getLogger } from '../../logger/logger.js';
import { Abbildung } from '../entity/abbildung.entity.js';
import { Auto } from '../entity/auto.entity.js';
import { DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE } from './pageable.js';
import { type Pageable } from './pageable.js';
import { Modell } from '../entity/modell.entity.js';
import { type Suchkriterien } from './suchkriterien.js';

/** Typdefinitionen für die Suche mit der Auto-ID. */
export type BuildIdParams = {
    /** ID des gesuchten Autos. */
    readonly id: number;
    /** Sollen die Abbildungen mitgeladen werden? */
    readonly mitAbbildungen?: boolean;
};
/**
 * Die Klasse `QueryBuilder` implementiert das Lesen für Autos und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class QueryBuilder {
    readonly #autoAlias = `${Auto.name
        .charAt(0)
        .toLowerCase()}${Auto.name.slice(1)}`;

    readonly #titelAlias = `${Modell.name
        .charAt(0)
        .toLowerCase()}${Modell.name.slice(1)}`;

    readonly #abbildungAlias = `${Abbildung.name
        .charAt(0)
        .toLowerCase()}${Abbildung.name.slice(1)}`;

    readonly #repo: Repository<Auto>;

    readonly #logger = getLogger(QueryBuilder.name);

    constructor(@InjectRepository(Auto) repo: Repository<Auto>) {
        this.#repo = repo;
    }

    /**
     * Ein Auto mit der ID suchen.
     * @param id ID des gesuchten Autos
     * @returns QueryBuilder
     */
    buildId({ id, mitAbbildungen = false }: BuildIdParams) {
        // QueryBuilder "auto" fuer Repository<Auto>
        const queryBuilder = this.#repo.createQueryBuilder(this.#autoAlias);

        // Fetch-Join: aus QueryBuilder "auto" die Property "modell" ->  Tabelle "modell"
        queryBuilder.innerJoinAndSelect(
            `${this.#autoAlias}.modell`,
            this.#titelAlias,
        );

        if (mitAbbildungen) {
            // Fetch-Join: aus QueryBuilder "auto" die Property "abbildungen" -> Tabelle "abbildung"
            queryBuilder.leftJoinAndSelect(
                `${this.#autoAlias}.abbildungen`,
                this.#abbildungAlias,
            );
        }

        queryBuilder.where(`${this.#autoAlias}.id = :id`, { id: id }); // eslint-disable-line object-shorthand
        return queryBuilder;
    }

    /**
     * Autos asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien. Bei "modell" wird mit
     * einem Teilstring gesucht, bei "ps" mit einem Mindestwert, bei "preis"
     * mit der Obergrenze.
     * @param pageable Maximale Anzahl an Datensätzen und Seitennummer.
     * @returns QueryBuilder
     */
    // z.B. { modell: 'a', ps: 5, preis: 22.5, javascript: true }
    // "rest properties" fuer anfaengliche WHERE-Klausel: ab ES 2018 https://github.com/tc39/proposal-object-rest-spread
    // eslint-disable-next-line max-lines-per-function, prettier/prettier, sonarjs/cognitive-complexity
    build(
        {
            // NOSONAR
            modell,
            ps,
            preis,
            javascript,
            typescript,
            java,
            python,
            ...restProps
        }: Suchkriterien,
        pageable: Pageable,
    ) {
        this.#logger.debug(
            'build: modell=%s, ps=%s, preis=%s, javascript=%s, typescript=%s, java=%s, python=%s, restProps=%o, pageable=%o',
            modell,
            ps,
            preis,
            javascript,
            typescript,
            java,
            python,
            restProps,
            pageable,
        );

        let queryBuilder = this.#repo.createQueryBuilder(this.#autoAlias);
        queryBuilder.innerJoinAndSelect(`${this.#autoAlias}.modell`, 'modell');

        // z.B. { modell: 'a', ps: 5, javascript: true }
        // "rest properties" fuer anfaengliche WHERE-Klausel: ab ES 2018 https://github.com/tc39/proposal-object-rest-spread
        // type-coverage:ignore-next-line
        // const { modell, javascript, typescript, ...otherProps } = suchkriterien;

        let useWhere = true;

        // Modell in der Query: Teilstring des Titels und "case insensitive"
        // CAVEAT: MySQL hat keinen Vergleich mit "case insensitive"
        // type-coverage:ignore-next-line
        if (modell !== undefined && typeof modell === 'string') {
            const ilike =
                typeOrmModuleOptions.type === 'postgres' ? 'ilike' : 'like';
            queryBuilder = queryBuilder.where(
                `${this.#titelAlias}.modell ${ilike} :modell`,
                { modell: `%${modell}%` },
            );
            useWhere = false;
        }

        if (ps !== undefined) {
            const psNumber =
                typeof ps === 'string' ? parseInt(ps) : ps;
            if (!isNaN(psNumber)) {
                queryBuilder = queryBuilder.where(
                    `${this.#autoAlias}.ps >= ${psNumber}`,
                );
                useWhere = false;
            }
        }

        if (preis !== undefined && typeof preis === 'string') {
            const preisNumber = Number(preis);
            queryBuilder = queryBuilder.where(
                `${this.#autoAlias}.preis <= ${preisNumber}`,
            );
            useWhere = false;
        }

        if (javascript === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#autoAlias}.schlagwoerter like '%JAVASCRIPT%'`,
                  )
                : queryBuilder.andWhere(
                      `${this.#autoAlias}.schlagwoerter like '%JAVASCRIPT%'`,
                  );
            useWhere = false;
        }

        if (typescript === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#autoAlias}.schlagwoerter like '%TYPESCRIPT%'`,
                  )
                : queryBuilder.andWhere(
                      `${this.#autoAlias}.schlagwoerter like '%TYPESCRIPT%'`,
                  );
            useWhere = false;
        }

        // Bei "JAVA" sollen Ergebnisse mit "JAVASCRIPT" _nicht_ angezeigt werden
        if (java === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `REPLACE(${this.#autoAlias}.schlagwoerter, 'JAVASCRIPT', '') like '%JAVA%'`,
                  )
                : queryBuilder.andWhere(
                      `REPLACE(${this.#autoAlias}.schlagwoerter, 'JAVASCRIPT', '') like '%JAVA%'`,
                  );
            useWhere = false;
        }

        if (python === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#autoAlias}.schlagwoerter like '%PYTHON%'`,
                  )
                : queryBuilder.andWhere(
                      `${this.#autoAlias}.schlagwoerter like '%PYTHON%'`,
                  );
            useWhere = false;
        }

        // Restliche Properties als Key-Value-Paare: Vergleiche auf Gleichheit
        Object.entries(restProps).forEach(([key, value]) => {
            const param: Record<string, any> = {};
            param[key] = value; // eslint-disable-line security/detect-object-injection
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#autoAlias}.${key} = :${key}`,
                      param,
                  )
                : queryBuilder.andWhere(
                      `${this.#autoAlias}.${key} = :${key}`,
                      param,
                  );
            useWhere = false;
        });

        this.#logger.debug('build: sql=%s', queryBuilder.getSql());

        if (pageable?.size === 0) {
            return queryBuilder;
        }
        const size = pageable?.size ?? DEFAULT_PAGE_SIZE;
        const number = pageable?.number ?? DEFAULT_PAGE_NUMBER;
        const skip = number * size;
        this.#logger.debug('take=%s, skip=%s', size, skip);
        return queryBuilder.take(size).skip(skip);
    }
}
