import type { BaseLogger } from 'pino';
import type { DataAssetTask } from '../../models.js';
import { SendTaskSuccessCommand, SFNClient } from '@aws-sdk/client-sfn';
import { DATA_LINEAGE_DIRECT_HUB_INGESTION_REQUEST_EVENT, DATA_LINEAGE_HUB_EVENT_SOURCE, EventBridgeEventBuilder, type EventPublisher, OpenLineageBuilder, RunEvent } from '@dm/events';

export class LineageTask {

    constructor(
        private log: BaseLogger,
        private sfnClient: SFNClient,
        private eventBusName: string,
        private eventPublisher: EventPublisher
    ) {
    }

    public async process(event: DataAssetTask): Promise<any> {
        this.log.info(`LineageTask > process > in > event: ${JSON.stringify(event)}`);

        // Construct the asset lineage for all created assets
        const lineageRunCompleteEventPayload = this.constructLineage(event.dataAsset.lineage.root, event.dataAsset.catalog.assetName)

        const openLineageEvent = new EventBridgeEventBuilder()
            .setEventBusName(this.eventBusName)
            .setSource(DATA_LINEAGE_HUB_EVENT_SOURCE)
            .setDetailType(DATA_LINEAGE_DIRECT_HUB_INGESTION_REQUEST_EVENT)
            .setDetail(lineageRunCompleteEventPayload);

        await this.eventPublisher.publish(openLineageEvent);

        this.log.info(`LineageTask > process > exit`);

        await this.sfnClient.send(new SendTaskSuccessCommand({output: JSON.stringify(event), taskToken: event.execution.taskToken}));
    }

    private constructLineage(startLineageEvent: Partial<RunEvent>, assetName: string): Partial<RunEvent> {
        const builder = new OpenLineageBuilder();
        return builder
            .setOpenLineageEvent(startLineageEvent)
            .setDatasetOutput({
                name: assetName,
                storage: {
                    storageLayer: 'glue'
                }
            }).setEndJob({
                endTime: new Date().toISOString(),
                eventType: 'COMPLETE'
            })
            .build();
    }

}
