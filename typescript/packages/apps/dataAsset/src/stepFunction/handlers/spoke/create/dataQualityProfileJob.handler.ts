import { buildLightApp } from '../../../../app.light.js';
import type { AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';
import type { DataQualityProfileJobTask } from '../../../tasks/spoke/create/dataQualityProfileJobTask.js';
import type { DataAssetTaskHandler as Handler } from '../../../tasks/models.js';

const app: FastifyInstance = await buildLightApp();
const di: AwilixContainer = app.diContainer;

export const handler: Handler = async (event, _context, _callback) => {
	app.log.debug(`RunJobHandler > handler > event: ${JSON.stringify(event)}`);
	const task = di.resolve<DataQualityProfileJobTask>('dataQualityProfileJobTask');
	const output = await task.process(event);
	app.log.debug(`RunJobHandler > handler > exit:`);
	return output;
};
