/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Copyright (C) 2025 - present Juergen Zimmermann, Hochschule Karlsruhe
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
import { beforeAll, describe, expect, test } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { type Auto, type AutoArt } from '../../src/auto/entity/auto.entity.js';
import { type GraphQLResponseBody } from './graphql.mjs';
import { baseURL, httpsAgent } from '../constants.mjs';

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
describe('GraphQL Queries', () => {
    let client: AxiosInstance;
    const graphqlPath = 'graphql';

    // Axios initialisieren
    beforeAll(async () => {
        const baseUrlGraphQL = `${baseURL}/`;
        client = axios.create({
            baseURL: baseUrlGraphQL,
            httpsAgent,
            // auch Statuscode 400 als gueltigen Request akzeptieren, wenn z.B.
            // ein Enum mit einem falschen String getestest wird
            validateStatus: () => true,
        });
    });

    test.concurrent('Auto zu vorhandener ID', async () => {
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

    test.concurrent('Auto zu nicht-vorhandener ID', async () => {
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

    test.concurrent('Auto zu vorhandenem Modell', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    autos(suchkriterien: {
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

        const { autos } = data.data! as { autos: AutoDTO[] };

        expect(autos).not.toHaveLength(0);
        expect(autos).toHaveLength(1);

        const [auto] = autos;

        expect(auto!.modell?.modell).toBe(titelVorhanden);
    });

    test.concurrent('Auto zu vorhandenem Teil-Modell', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    autos(suchkriterien: {
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

        const { autos } = data.data! as { autos: AutoDTO[] };

        expect(autos).not.toHaveLength(0);

        autos
            .map((auto) => auto.modell)
            .forEach((modell) =>
                expect(modell?.modell?.toLowerCase()).toStrictEqual(
                    expect.stringContaining(teilTitelVorhanden),
                ),
            );
    });

    test.concurrent('Auto zu nicht vorhandenem Modell', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    autos(suchkriterien: {
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
        expect(data.data!.autos).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toMatch(/^Keine Autos gefunden:/u);
        expect(path).toBeDefined();
        expect(path![0]).toBe('autos');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test.concurrent(
        'Auto zu vorhandener FAHRGESTELLNUMMER-Nummer',
        async () => {
            // given
            const body: GraphQLRequest = {
                query: `
                {
                    autos(suchkriterien: {
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
            const {
                status,
                headers,
                data,
            }: AxiosResponse<GraphQLResponseBody> = await client.post(
                graphqlPath,
                body,
            );

            // then
            expect(status).toBe(HttpStatus.OK);
            expect(headers['content-type']).toMatch(/json/iu);
            expect(data.errors).toBeUndefined();
            expect(data.data).toBeDefined();

            const { autos } = data.data! as { autos: AutoDTO[] };

            expect(autos).not.toHaveLength(0);
            expect(autos).toHaveLength(1);

            const [auto] = autos;
            const { fahrgestellnummer, modell } = auto!;

            expect(fahrgestellnummer).toBe(fahrgestellnummerVorhanden);
            expect(modell?.modell).toBeDefined();
        },
    );

    test.concurrent('Autos mit Mindest-"ps"', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    autos(suchkriterien: {
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

        const { autos } = data.data! as { autos: AutoDTO[] };

        expect(autos).not.toHaveLength(0);

        autos.forEach((auto) => {
            const { ps, modell } = auto;

            expect(ps).toBeGreaterThanOrEqual(psMin);
            expect(modell?.modell?.toLowerCase()).toStrictEqual(
                expect.stringContaining(teilTitelVorhanden),
            );
        });
    });

    test.concurrent('Kein Auto zu nicht-vorhandenem "ps"', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    autos(suchkriterien: {
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
        expect(data.data!.autos).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toMatch(/^Keine Autos gefunden:/u);
        expect(path).toBeDefined();
        expect(path![0]).toBe('autos');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test.concurrent('Autos zur Art "Sportwagen"', async () => {
        // given
        const autoArt: AutoArt = 'Sportwagen';
        const body: GraphQLRequest = {
            query: `
                {
                    autos(suchkriterien: {
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

        const { autos } = data.data! as { autos: AutoDTO[] };

        expect(autos).not.toHaveLength(0);

        autos.forEach((auto) => {
            const { art, modell } = auto;

            expect(art).toBe(autoArt);
            expect(modell?.modell).toBeDefined();
        });
    });

    test.concurrent('Autos zur einer ungueltigen Art', async () => {
        // given
        const autoArt = 'UNGUELTIG';
        const body: GraphQLRequest = {
            query: `
                {
                    autos(suchkriterien: {
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

    test.concurrent('Autos mit lieferbar=true', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    autos(suchkriterien: {
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

        const { autos } = data.data! as { autos: AutoDTO[] };

        expect(autos).not.toHaveLength(0);

        autos.forEach((auto) => {
            const { lieferbar, modell } = auto;

            expect(lieferbar).toBe(true);
            expect(modell?.modell).toBeDefined();
        });
    });
});

/* eslint-enable @typescript-eslint/no-non-null-assertion */
