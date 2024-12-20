import { buildLightApp } from '../../../../app.light.js';
import type { AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';
import type { LineageTask } from '../../../tasks/hub/create/lineageTask.js'
import type { DataAssetTaskHandler as Handler } from '../../../tasks/models.js';

const app: FastifyInstance = await buildLightApp();
const di: AwilixContainer = app.diContainer;

export const handler: Handler = async (event, _context, _callback) => {
	app.log.debug(`LineageHandler > handler > event: ${JSON.stringify(event)}`);
	const task = di.resolve<LineageTask>('hubLineageTask');
	const output = await task.process(event);
	app.log.debug(`LineageHandler > handler > exit:`);
	return output;
};
