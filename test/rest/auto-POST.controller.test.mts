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

import { beforeAll, describe, expect, inject, test } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { Decimal } from 'decimal.js';
import { type AutoDTO } from '../../src/auto/controller/autoDTO.entity.js';
import { AutoReadService } from '../../src/auto/service/auto-read.service.js';
import { baseURL, httpsAgent } from '../constants.mjs';
import { type ErrorResponse } from './error-response.mjs';

const token = inject('tokenRest');

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neuesAuto: Omit<AutoDTO, 'preis' | 'rabatt'> & {
    preis: number;
    rabatt: number;
} = {
    fahrgestellnummer: '978-0-007-00644-1',
    ps: 1,
    art: 'SUV',
    preis: 99.99,
    rabatt: 0.0123,
    lieferbar: true,
    datum: '2022-02-28',
    homepage: 'https://post.rest',
    schlagwoerter: ['JAVASCRIPT', 'TYPESCRIPT'],
    modell: {
        modell: 'Titelpost',
        untertitel: 'untertitelpos',
    },
    abbildungen: [
        {
            beschriftung: 'Abb. 1',
            contentType: 'img/png',
        },
    ],
};
const neuesAutoInvalid: Record<string, unknown> = {
    fahrgestellnummer: 'falsche-FAHRGESTELLNUMMER',
    ps: -1,
    art: 'UNSICHTBAR',
    preis: -1,
    rabatt: 2,
    lieferbar: true,
    datum: '12345-123-123',
    homepage: 'anyHomepage',
    modell: {
        modell: '?!',
        untertitel: 'Untertitelinvalid',
    },
};
const neuesAutoFahrgestellnummerExistiert: AutoDTO = {
    fahrgestellnummer: '978-3-897-22583-1',
    ps: 1,
    art: 'Sportwagen',
    preis: new Decimal(99.99),
    rabatt: new Decimal(0.09),
    lieferbar: true,
    datum: '2022-02-28',
    homepage: 'https://post.fahrgestellnummer/',
    schlagwoerter: ['JAVASCRIPT', 'TYPESCRIPT'],
    modell: {
        modell: 'Titelpostfahrgestellnummer',
        untertitel: 'Untertitelpostfahrgestellnummer',
    },
    abbildungen: [],
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('POST /rest', () => {
    let client: AxiosInstance;
    const restURL = `${baseURL}/rest`;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Axios initialisieren
    beforeAll(async () => {
        client = axios.create({
            baseURL: restURL,
            httpsAgent,
            validateStatus: (status) => status < 500,
        });
    });

    test('Neues Auto', async () => {
        // given
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<string> = await client.post(
            '',
            neuesAuto,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.CREATED);

        const { location } = response.headers as { location: string };

        expect(location).toBeDefined();

        // ID nach dem letzten "/"
        const indexLastSlash: number = location.lastIndexOf('/');

        expect(indexLastSlash).not.toBe(-1);

        const idStr = location.slice(indexLastSlash + 1);

        expect(idStr).toBeDefined();
        expect(AutoReadService.ID_PATTERN.test(idStr)).toBe(true);

        expect(data).toBe('');
    });

    test.concurrent('Neues Auto mit ungueltigen Daten', async () => {
        // given
        headers.Authorization = `Bearer ${token}`;
        const expectedMsg = [
            expect.stringMatching(/^fahrgestellnummer /u),
            expect.stringMatching(/^ps /u),
            expect.stringMatching(/^art /u),
            expect.stringMatching(/^preis /u),
            expect.stringMatching(/^rabatt /u),
            expect.stringMatching(/^datum /u),
            expect.stringMatching(/^homepage /u),
            expect.stringMatching(/^modell.modell /u),
        ];

        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '',
            neuesAutoInvalid,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.BAD_REQUEST);

        const messages = data.message as string[];

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toStrictEqual(expect.arrayContaining(expectedMsg));
    });

    test.concurrent('Neues Auto, aber die FAHRGESTELLNUMMER existiert bereits', async () => {
        // given
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<ErrorResponse> = await client.post(
            '',
            neuesAutoFahrgestellnummerExistiert,
            { headers },
        );

        // then
        const { data } = response;

        const { message, statusCode } = data;

        expect(message).toStrictEqual(expect.stringContaining('FAHRGESTELLNUMMER'));
        expect(statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    test.concurrent('Neues Auto, aber ohne Token', async () => {
        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '',
            neuesAuto,
        );

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.concurrent('Neues Auto, aber mit falschem Token', async () => {
        // given
        const token = 'FALSCH';
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '',
            neuesAuto,
            { headers },
        );

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.concurrent.todo('Abgelaufener Token');
});
