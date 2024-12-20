import fp from 'fastify-plugin';
import fastifyEnv, { FastifyEnvOptions } from '@fastify/env';
import { Static, Type } from '@sinclair/typebox';
import { baseConfigSchema, convertFromTypeBoxIntersectToJSONSchema } from '@dm/resource-api-base';

// eslint-disable-next-line @rushstack/typedef-var
export const moduleConfigSchema = Type.Object({
	EVENT_BUS_NAME: Type.String(),
	PORT: Type.Number({ default: 30004 }),
	TABLE_NAME: Type.String()
});
export const configSchema = Type.Intersect([moduleConfigSchema, baseConfigSchema]);

export type ConfigSchemaType = Static<typeof configSchema>;

export default fp<FastifyEnvOptions>(async (app): Promise<void> => {
	await app.register(fastifyEnv, {
		confKey: 'config',
		schema: convertFromTypeBoxIntersectToJSONSchema(configSchema),
		dotenv: true,
	});
	app.log.info(`config: ${JSON.stringify(app.config)}`);
});

declare module 'fastify' {
	interface FastifyInstance {
		config: ConfigSchemaType;
	}
}
