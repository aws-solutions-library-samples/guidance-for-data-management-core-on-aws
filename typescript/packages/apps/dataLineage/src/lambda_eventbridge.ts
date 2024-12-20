import type { Callback, Context, EventBridgeHandler } from 'aws-lambda';
import type { AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';
import { buildLightApp } from './app.light.js';
import { DATA_LINEAGE_DIRECT_HUB_INGESTION_REQUEST_EVENT, DATA_LINEAGE_DIRECT_SPOKE_INGESTION_REQUEST_EVENT, RunEvent } from '@dm/events';
import type { DirectLineageEventProcessor } from './events/directLineage.eventProcessor.js';

const app: FastifyInstance = await buildLightApp();
const di: AwilixContainer = app.diContainer;

const eventProcessor = di.resolve<DirectLineageEventProcessor>('directLineageEventProcessor');


export const handler: EventBridgeHandler<string, EventDetails, void> = async (event, _context: Context, _callback: Callback) => {
    app.log.info(`EventBridgeLambda > handler > event: ${JSON.stringify(event)}`);

    // filter event for direct ingestion into Marquez
    if ([DATA_LINEAGE_DIRECT_HUB_INGESTION_REQUEST_EVENT, DATA_LINEAGE_DIRECT_SPOKE_INGESTION_REQUEST_EVENT].includes(event['detail-type'])) {
        const detail = event.detail as RunEvent;
        await eventProcessor.processDirectLineageIngestionEvent(detail);

        // any other events are not handled
    } else {
        app.log.error('EventBridgeLambda > handler > Unimplemented event: ${JSON.Stringify(event)}');
    }

};

type EventDetails = RunEvent


