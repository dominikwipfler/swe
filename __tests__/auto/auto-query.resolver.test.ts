/* eslint-disable max-lines, @typescript-eslint/no-non-null-assertion */
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

import { type GraphQLRequest } from '@apollo/server';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { type Auto, type AutoArt } from '../../src/auto/entity/auto.entity.js';
import { type GraphQLResponseBody } from '../graphql.js';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';

type AutoDTO = Omit<
    Auto,
    'abbildungen' | 'aktualisiert' | 'erzeugt' | 'rabatt'
> & {
    rabatt: string;
};

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const idVorhanden = '1';

const titelVorhanden = 'Alpha';
const teilTitelVorhanden = 'a';
const teilTitelNichtVorhanden = 'abc';

const fahrgestellnummerVorhanden = '978-3-897-22583-1';

const psMin = 3;
const psNichtVorhanden = 99;

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('GraphQL Queries', () => {
    let client: AxiosInstance;
    const graphqlPath = 'graphql';

    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await startServer();
        const baseURL = `https://${host}:${port}/`;
        client = axios.create({
            baseURL,
            httpsAgent,
            // auch Statuscode 400 als gueltigen Request akzeptieren, wenn z.B.
            // ein Enum mit einem falschen String getestest wird
            validateStatus: () => true,
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    test('Auto zu vorhandener ID', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    auto(id: "${idVorhanden}") {
                        version
                        fahrgestellnummer
                        ps
                        art
                        preis
                        lieferbar
                        datum
                        homepage
                        schlagwoerter
                        modell {
                            modell
                        }
                        rabatt(short: true)
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { auto } = data.data! as { auto: AutoDTO };

        expect(auto.modell?.modell).toMatch(/^\w/u);
        expect(auto.version).toBeGreaterThan(-1);
        expect(auto.id).toBeUndefined();
    });

    test('Auto zu nicht-vorhandener ID', async () => {
        // given
        const id = '999999';
        const body: GraphQLRequest = {
            query: `
                {
                    auto(id: "${id}") {
                        modell {
                            modell
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.auto).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toBe(`Es gibt kein Auto mit der ID ${id}.`);
        expect(path).toBeDefined();
        expect(path![0]).toBe('auto');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test('Auto zu vorhandenem Modell', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        modell: "${titelVorhanden}"
                    }) {
                        art
                        modell {
                            modell
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { buecher } = data.data! as { buecher: AutoDTO[] };

        expect(buecher).not.toHaveLength(0);
        expect(buecher).toHaveLength(1);

        const [auto] = buecher;

        expect(auto!.modell?.modell).toBe(titelVorhanden);
    });

    test('Auto zu vorhandenem Teil-Modell', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        modell: "${teilTitelVorhanden}"
                    }) {
                        modell {
                            modell
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { buecher } = data.data! as { buecher: AutoDTO[] };

        expect(buecher).not.toHaveLength(0);

        buecher
            .map((auto) => auto.modell)
            .forEach((modell) =>
                expect(modell?.modell?.toLowerCase()).toEqual(
                    expect.stringContaining(teilTitelVorhanden),
                ),
            );
    });

    test('Auto zu nicht vorhandenem Modell', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        modell: "${teilTitelNichtVorhanden}"
                    }) {
                        art
                        modell {
                            modell
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.buecher).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toMatch(/^Keine Buecher gefunden:/u);
        expect(path).toBeDefined();
        expect(path![0]).toBe('buecher');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test('Auto zu vorhandener ISBN-Nummer', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        fahrgestellnummer: "${fahrgestellnummerVorhanden}"
                    }) {
                        fahrgestellnummer
                        modell {
                            modell
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { buecher } = data.data! as { buecher: AutoDTO[] };

        expect(buecher).not.toHaveLength(0);
        expect(buecher).toHaveLength(1);

        const [auto] = buecher;
        const { fahrgestellnummer, modell } = auto!;

        expect(fahrgestellnummer).toBe(fahrgestellnummerVorhanden);
        expect(modell?.modell).toBeDefined();
    });

    test('Buecher mit Mindest-"ps"', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        ps: ${psMin},
                        modell: "${teilTitelVorhanden}"
                    }) {
                        ps
                        modell {
                            modell
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        expect(data.data).toBeDefined();

        const { buecher } = data.data! as { buecher: AutoDTO[] };

        expect(buecher).not.toHaveLength(0);

        buecher.forEach((auto) => {
            const { ps, modell } = auto;

            expect(ps).toBeGreaterThanOrEqual(psMin);
            expect(modell?.modell?.toLowerCase()).toEqual(
                expect.stringContaining(teilTitelVorhanden),
            );
        });
    });

    test('Kein Auto zu nicht-vorhandenem "ps"', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        ps: ${psNichtVorhanden}
                    }) {
                        modell {
                            modell
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.buecher).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toMatch(/^Keine Buecher gefunden:/u);
        expect(path).toBeDefined();
        expect(path![0]).toBe('buecher');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test('Buecher zur Art "SUV"', async () => {
        // given
        const autoArt: AutoArt = 'SUV';
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        art: ${autoArt}
                    }) {
                        art
                        modell {
                            modell
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { buecher } = data.data! as { buecher: AutoDTO[] };

        expect(buecher).not.toHaveLength(0);

        buecher.forEach((auto) => {
            const { art, modell } = auto;

            expect(art).toBe(autoArt);
            expect(modell?.modell).toBeDefined();
        });
    });

    test('Buecher zur einer ungueltigen Art', async () => {
        // given
        const autoArt = 'UNGUELTIG';
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        art: ${autoArt}
                    }) {
                        modell {
                            modell
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.BAD_REQUEST);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data).toBeUndefined();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { extensions } = error;

        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('GRAPHQL_VALIDATION_FAILED');
    });

    test('Buecher mit lieferbar=true', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        lieferbar: true
                    }) {
                        lieferbar
                        modell {
                            modell
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { buecher } = data.data! as { buecher: AutoDTO[] };

        expect(buecher).not.toHaveLength(0);

        buecher.forEach((auto) => {
            const { lieferbar, modell } = auto;

            expect(lieferbar).toBe(true);
            expect(modell?.modell).toBeDefined();
        });
    });
});

/* eslint-enable max-lines, , @typescript-eslint/no-non-null-assertion */
