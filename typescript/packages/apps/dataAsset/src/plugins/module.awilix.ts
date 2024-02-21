import pkg from 'aws-xray-sdk';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { SFNClient } from '@aws-sdk/client-sfn';
import { DataZoneClient } from '@aws-sdk/client-datazone';
import { Cradle, diContainer, FastifyAwilixOptions, fastifyAwilixPlugin } from '@fastify/awilix';
import { asFunction, Lifetime } from 'awilix';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { DynamoDbUtils } from '@sdf/dynamodb-utils';
import { DataAssetEventProcessor } from '../events/dataAsset.eventProcessor.js';
import { DataAssetRepository } from '../api/dataAsset/repository.js';
import { DataAssetService } from '../api/dataAsset/service.js';
import { BaseCradle, registerBaseAwilix } from '@sdf/resource-api-base';
import { EventPublisher, DATA_ASSET_HUB_EVENT_SOURCE } from '@sdf/events';
 import { ConnectionTask} from '../stepFunction/tasks/connectionTask.js';
 import { DataBrewTask} from '../stepFunction/tasks/dataBrewTask.js';
 import { DataSetTask} from '../stepFunction/tasks/dataSetTask.js';
 import { RunJobTask} from '../stepFunction/tasks/runJobTask.js';
import { GlueClient } from '@aws-sdk/client-glue';
import { DataBrewClient } from '@aws-sdk/client-databrew';


const { captureAWSv3Client } = pkg;


declare module '@fastify/awilix' {
	interface Cradle extends BaseCradle {
		dataAssetEventProcessor: DataAssetEventProcessor;
		eventBridgeClient: EventBridgeClient;
		dynamoDbUtils: DynamoDbUtils;
		stepFunctionClient: SFNClient;
		dataZoneClient: DataZoneClient;
		glueClient: GlueClient;
		dataBrewClient: DataBrewClient;
		eventPublisher: EventPublisher;
		dataAssetRepository: DataAssetRepository;
		dataAssetService: DataAssetService;
		connectionTask:ConnectionTask;
		dataBrewTask:DataBrewTask;
		dataSetTask:DataSetTask;
		runJobTask:RunJobTask;
	}
}

class EventBridgeClientFactory {
	public static create(region: string | undefined): EventBridgeClient {
		const eb = captureAWSv3Client(new EventBridgeClient({ region }));
		return eb;
	}
}

class StepFunctionClientFactory {
	public static create(region: string | undefined): SFNClient {
		const sfn = captureAWSv3Client(new SFNClient({ region }));
		return sfn;
	}
}

class DataZoneClientFactory {
	public static create(region: string | undefined): DataZoneClient {
		const dz = captureAWSv3Client(new DataZoneClient({ region }));
		return dz;
	}
}

class GlueClientFactory {
	public static create(region: string | undefined): GlueClient {
		const glue = captureAWSv3Client(new GlueClient({ region }));
		return glue;
	}
}

class DataBrewClientFactory {
	public static create(region: string | undefined): DataBrewClient {
		const db = captureAWSv3Client(new DataBrewClient({ region }));
		return db;
	}
}

const registerContainer = (app?: FastifyInstance) => {
	const commonInjectionOptions = {
		lifetime: Lifetime.SINGLETON
	};

	const awsRegion = process.env['AWS_REGION'];
	const eventBusName = process.env['EVENT_BUS_NAME'];
	const hubStateMachineArn = process.env['ASSET_MANAGEMENT_HUB_STATE_MACHINE_ARN'];
	const JobsBucketName = process.env['JOBS_BUCKET_NAME'];
	const JobsBucketPrefix= process.env['JOBS_BUCKET_PREFIX'];

	diContainer.register({

		// Clients
		eventBridgeClient: asFunction(() => EventBridgeClientFactory.create(awsRegion), {
			...commonInjectionOptions
		}),
		stepFunctionClient: asFunction(() => StepFunctionClientFactory.create(awsRegion), {
			...commonInjectionOptions
		}),

		dataZoneClient: asFunction(() => DataZoneClientFactory.create(awsRegion), {
			...commonInjectionOptions
		}),

		glueClient: asFunction(() => GlueClientFactory.create(awsRegion), {
			...commonInjectionOptions
		}),

		dataBrewClient: asFunction(() => DataBrewClientFactory.create(awsRegion), {
			...commonInjectionOptions
		}),

		dynamoDbUtils: asFunction((container: Cradle) => new DynamoDbUtils(app.log, container.dynamoDBDocumentClient), {
			...commonInjectionOptions,
		}),

		eventPublisher: asFunction((container: Cradle) => new EventPublisher(app.log, container.eventBridgeClient, eventBusName, DATA_ASSET_HUB_EVENT_SOURCE), {
			...commonInjectionOptions
		}),
		
		
		dataAssetEventProcessor: asFunction(
			() =>
				new DataAssetEventProcessor(
					app.log
				),
			{
				...commonInjectionOptions
			}
		),

		// Repositories

		dataAssetRepository: asFunction(
			(container) =>
				new DataAssetRepository(
					app.log,
					container.dynamoDBDocumentClient,
					app.config.TABLE_NAME,
					container.dynamoDbUtils
				),
			{
				...commonInjectionOptions,
			}
		),

		// Services

		dataAssetService: asFunction(
			(container) =>
				new DataAssetService(
					app.log,
					container.dataAssetRepository,
					container.stepFunctionClient,
					container.dataZoneClient,
					container.eventPublisher,
					eventBusName,
					hubStateMachineArn
				),
			{
				...commonInjectionOptions,
			}
		),

		// Tasks

		connectionTask: asFunction((container: Cradle) => new ConnectionTask(app.log, container.stepFunctionClient), {
			...commonInjectionOptions
		}),

		dataBrewTask: asFunction((container: Cradle) => new DataBrewTask(app.log, container.stepFunctionClient, container.dataBrewClient, JobsBucketName, JobsBucketPrefix), {
			...commonInjectionOptions
		}),

		dataSetTask: asFunction((container: Cradle) => new DataSetTask(app.log, container.stepFunctionClient, container.dataBrewClient), {
			...commonInjectionOptions
		}),

		runJobTask: asFunction((container: Cradle) => new RunJobTask(app.log, container.stepFunctionClient), {
			...commonInjectionOptions
		}),

		
	});
};

export default fp<FastifyAwilixOptions>(async (app: FastifyInstance): Promise<void> => {
	// first register the DI plugin
	await app.register(fastifyAwilixPlugin, {
		disposeOnClose: true,
		disposeOnResponse: false
	});

	registerBaseAwilix(app.log);

	registerContainer(app);
});

export { registerContainer };