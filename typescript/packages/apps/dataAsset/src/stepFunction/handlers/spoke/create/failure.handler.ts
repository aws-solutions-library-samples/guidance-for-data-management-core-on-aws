import { buildLightApp } from '../../../../app.light.js';
import type { AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';
import type { FailureTask } from '../../../tasks/spoke/create/failureTask.js';
import type { FailureTaskHandler as Handler } from '../../../tasks/models.js';

const app: FastifyInstance = await buildLightApp();
const di: AwilixContainer = app.diContainer;

export const handler: Handler = async (event, _context, _callback) => {
	app.log.debug(`FailureHandler > handler > event: ${JSON.stringify(event)}`);
	const task = di.resolve<FailureTask>('spokeFailureTask');
	const output = await task.process(event);
	app.log.debug(`FailureHandler > handler > exit:`);
	return output;
};
