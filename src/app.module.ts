// Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
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

import { type ApolloDriverConfig } from '@nestjs/apollo';
import {
    type MiddlewareConsumer,
    Module,
    type NestModule,
} from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module.js';
import { AutoModule } from './auto/auto.module.js';
import { AutoGetController } from './auto/controller/auto-get.controller.js';
import { AutoWriteController } from './auto/controller/auto-write.controller.js';
import { DevModule } from './config/dev/dev.module.js';
import { graphQlModuleOptions } from './config/graphql.js';
import { typeOrmModuleOptions } from './config/typeormOptions.js';
import { LoggerModule } from './logger/logger.module.js';
import { RequestLoggerMiddleware } from './logger/request-logger.middleware.js';
import { KeycloakModule } from './security/keycloak/keycloak.module.js';

@Module({
    imports: [
        AdminModule,
        AutoModule,
        DevModule,
        GraphQLModule.forRoot<ApolloDriverConfig>(graphQlModuleOptions),
        LoggerModule,
        KeycloakModule,
        TypeOrmModule.forRoot(typeOrmModuleOptions),
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RequestLoggerMiddleware)
            .forRoutes(
                AutoGetController,
                AutoWriteController,
                'auth',
                'graphql',
            );
    }
}
