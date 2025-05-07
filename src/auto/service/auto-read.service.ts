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
 * Das Modul besteht aus der Klasse {@linkcode AutoReadService}.
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getLogger } from '../../logger/logger.js';
import { AutoFile } from '../entity/autoFile.entity.js';
import { Auto } from '../entity/auto.entity.js';
import { type Pageable } from './pageable.js';
import { type Slice } from './slice.js';
import { QueryBuilder } from './query-builder.js';
import { type Suchkriterien } from './suchkriterien.js';

/**
 * Typdefinition für `findById`
 */
export type FindByIdParams = {
    /** ID des gesuchten Autos */
    readonly id: number;
    /** Sollen die Abbildungen mitgeladen werden? */
    readonly mitAbbildungen?: boolean;
};

/**
 * Die Klasse `AutoReadService` implementiert das Lesen für Autos und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class AutoReadService {
    static readonly ID_PATTERN = /^[1-9]\d{0,10}$/u;

    readonly #autoProps: string[];

    readonly #queryBuilder: QueryBuilder;

    readonly #fileRepo: Repository<AutoFile>;

    readonly #logger = getLogger(AutoReadService.name);

    constructor(
        queryBuilder: QueryBuilder,
        @InjectRepository(AutoFile) fileRepo: Repository<AutoFile>,
    ) {
        const autoDummy = new Auto();
        this.#autoProps = Object.getOwnPropertyNames(autoDummy);
        this.#queryBuilder = queryBuilder;
        this.#fileRepo = fileRepo;
    }

    // Rueckgabetyp Promise bei asynchronen Funktionen
    //    ab ES2015
    //    vergleiche Task<> bei C#
    // Status eines Promise:
    //    Pending: das Resultat ist noch nicht vorhanden, weil die asynchrone
    //             Operation noch nicht abgeschlossen ist
    //    Fulfilled: die asynchrone Operation ist abgeschlossen und
    //               das Promise-Objekt hat einen Wert
    //    Rejected: die asynchrone Operation ist fehlgeschlagen and das
    //              Promise-Objekt wird nicht den Status "fulfilled" erreichen.
    //              Im Promise-Objekt ist dann die Fehlerursache enthalten.

    /**
     * Ein Auto asynchron anhand seiner ID suchen
     * @param id ID des gesuchten Autos
     * @returns Das gefundene Auto in einem Promise aus ES2015.
     * @throws NotFoundException falls kein Auto mit der ID existiert
     */
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async findById({
        id,
        mitAbbildungen = false,
    }: FindByIdParams): Promise<Readonly<Auto>> {
        this.#logger.debug('findById: id=%d', id);

        // https://typeorm.io/working-with-repository
        // Das Resultat ist undefined, falls kein Datensatz gefunden
        // Lesen: Keine Transaktion erforderlich
        const auto = await this.#queryBuilder
            .buildId({ id, mitAbbildungen })
            .getOne();
        if (auto === null) {
            throw new NotFoundException(`Es gibt kein Auto mit der ID ${id}.`);
        }
        if (auto.schlagwoerter === null) {
            auto.schlagwoerter = [];
        }

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: auto=%s, modell=%o',
                auto.toString(),
                auto.modell,
            );
            if (mitAbbildungen) {
                this.#logger.debug(
                    'findById: abbildungen=%o',
                    auto.abbildungen,
                );
            }
        }
        return auto;
    }

    /**
     * Binärdatei zu einem Auto suchen.
     * @param autoId ID des zugehörigen Autos.
     * @returns Binärdatei oder undefined als Promise.
     */
    async findFileByAutoId(
        autoId: number,
    ): Promise<Readonly<AutoFile> | undefined> {
        this.#logger.debug('findFileByAutoId: autoId=%s', autoId);
        const autoFile = await this.#fileRepo
            .createQueryBuilder('auto_file')
            .where('auto_id = :id', { id: autoId })
            .getOne();
        if (autoFile === null) {
            this.#logger.debug('findFileByAutoId: Keine Datei gefunden');
            return;
        }

        this.#logger.debug('findFileByAutoId: filename=%s', autoFile.filename);
        return autoFile;
    }

    /**
     * Autos asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien.
     * @param pageable Maximale Anzahl an Datensätzen und Seitennummer.
     * @returns Ein JSON-Array mit den gefundenen Büchern.
     * @throws NotFoundException falls keine Autos gefunden wurden.
     */
    async find(
        suchkriterien: Suchkriterien | undefined,
        pageable: Pageable,
    ): Promise<Slice<Auto>> {
        this.#logger.debug(
            'find: suchkriterien=%o, pageable=%o',
            suchkriterien,
            pageable,
        );

        // Keine Suchkriterien?
        if (suchkriterien === undefined) {
            return await this.#findAll(pageable);
        }
        const keys = Object.keys(suchkriterien);
        if (keys.length === 0) {
            return await this.#findAll(pageable);
        }

        // Falsche Namen fuer Suchkriterien?
        if (!this.#checkKeys(keys) || !this.#checkEnums(suchkriterien)) {
            throw new NotFoundException('Ungueltige Suchkriterien');
        }

        // QueryBuilder https://typeorm.io/select-query-builder
        // Das Resultat ist eine leere Liste, falls nichts gefunden
        // Lesen: Keine Transaktion erforderlich
        const queryBuilder = this.#queryBuilder.build(suchkriterien, pageable);
        const buecher = await queryBuilder.getMany();
        if (buecher.length === 0) {
            this.#logger.debug('find: Keine Buecher gefunden');
            throw new NotFoundException(
                `Keine Buecher gefunden: ${JSON.stringify(suchkriterien)}, Seite ${pageable.number}}`,
            );
        }
        const totalElements = await queryBuilder.getCount();
        return this.#createSlice(buecher, totalElements);
    }

    async #findAll(pageable: Pageable) {
        const queryBuilder = this.#queryBuilder.build({}, pageable);
        const buecher = await queryBuilder.getMany();
        if (buecher.length === 0) {
            throw new NotFoundException(`Ungueltige Seite "${pageable.number}"`);
        }
        const totalElements = await queryBuilder.getCount();
        return this.#createSlice(buecher, totalElements);

    }

    #createSlice(buecher: Auto[], totalElements: number) {
        buecher.forEach((auto) => {
            if (auto.schlagwoerter === null) {
                auto.schlagwoerter = [];
            }
        });
        const autoSlice: Slice<Auto> = {
            content: buecher,
            totalElements,
        };
        this.#logger.debug('createSlice: autoSlice=%o', autoSlice);
        return autoSlice;
    }

    #checkKeys(keys: string[]) {
        this.#logger.debug('#checkKeys: keys=%s', keys);
        // Ist jedes Suchkriterium auch eine Property von Auto oder "schlagwoerter"?
        let validKeys = true;
        keys.forEach((key) => {
            if (
                !this.#autoProps.includes(key) &&
                key !== 'javascript' &&
                key !== 'typescript' &&
                key !== 'java' &&
                key !== 'python'
            ) {
                this.#logger.debug(
                    '#checkKeys: ungueltiges Suchkriterium "%s"',
                    key,
                );
                validKeys = false;
            }
        });

        return validKeys;
    }

    #checkEnums(suchkriterien: Suchkriterien) {
        const { art } = suchkriterien;
        this.#logger.debug('#checkEnums: Suchkriterium "art=%s"', art);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return (
            art === undefined ||
            art === 'SUV' ||
            art === 'Limousine' ||
            art === 'Cabrio'
        );
    }
}
