

import { Cradle, diContainer, FastifyAwilixOptions, fastifyAwilixPlugin } from '@fastify/awilix';
import { asFunction, Lifetime } from 'awilix';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { MarquezClient } from '@dm/clients';


import { DirectLineageEventProcessor } from '../events/directLineage.eventProcessor.js';


declare module '@fastify/awilix' {
	interface Cradle {
		marquezClient: MarquezClient;
		directLineageEventProcessor: DirectLineageEventProcessor;
	}
}

export default fp<FastifyAwilixOptions>(async (app: FastifyInstance): Promise<void> => {
	// first register the DI plugin
	await app.register(fastifyAwilixPlugin, {
		disposeOnClose: true,
		disposeOnResponse: false
	});

	const commonInjectionOptions = {
		lifetime: Lifetime.SINGLETON
	};

	const marquezUrl = process.env['MARQUEZ_URL'] as string;


	diContainer.register({
		
		marquezClient: asFunction(() => new MarquezClient(app.log, marquezUrl), {
			...commonInjectionOptions
		}),
		
		directLineageEventProcessor: asFunction(
			(container: Cradle) =>
				new DirectLineageEventProcessor(
					app.log,
					container.marquezClient
				),
			{
				...commonInjectionOptions
			}
		),
		
	});
});

