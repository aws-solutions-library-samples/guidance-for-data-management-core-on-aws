import type { BaseLogger } from 'pino';
import { DataAssetTask, TaskFailureEvent, TaskType } from '../../models.js';
import type { CreateResponseEventDetails, EventPublisher } from '@df/events';
import { DATA_ASSET_SPOKE_CREATE_RESPONSE_EVENT, DATA_ASSET_SPOKE_EVENT_SOURCE, EventBridgeEventBuilder } from '@df/events';
import type { S3Utils } from '../../../../common/s3Utils.js';
import { DeleteDatasetCommand, type DataBrewClient, DeleteJobCommand } from '@aws-sdk/client-databrew';
import axios from 'axios';


// A generic failure task meant to capture all failures in the spoke workflow
export class FailureTask {

    constructor(
        private log: BaseLogger,
        private eventBusName: string,
        private eventPublisher: EventPublisher,
        private readonly s3Utils: S3Utils,
        private dataBrewClient: DataBrewClient
    ) {
    }

    // Publish the response event
    public async process(event: TaskFailureEvent): Promise<any> {
        this.log.info(`FailureTask > process > in > event: ${JSON.stringify(event)}`);
        
        // Get the full payload
        const inputSignedUrl = JSON.parse(event.errorCause)['signedUrl'];
        const res = await axios.get(inputSignedUrl);
        const payload: DataAssetTask = res.data;

        const assetDetails = payload.dataAsset;
        // Use assetId if it exists else no asset exists so use the id
        const id = (assetDetails.catalog?.assetId) ? assetDetails.catalog.assetId : assetDetails.id;

        try{

            const profile = await this.s3Utils.getTaskData(TaskType.DataProfileTask, id);

            // Start Cleanup stage this will be a best of effort cleanup

            if (profile.dataAsset.workflow?.transforms) {
                // Remove the recipe job
                try {
                    await this.dataBrewClient.send(new DeleteJobCommand({
                        Name: `${profile.dataAsset.workflow.name}-${id}-transform`
                    }));
                } catch (err) {
                    this.log.info(`FailureTask > process > DeleteRecipeJobFailed > error: ${JSON.stringify(err)}`);
                }

                // Remove the recipe data set
                try {
                    await this.dataBrewClient.send(new DeleteDatasetCommand({
                        Name: `${id}-recipeDataSet`
                    }));
                } catch (err) {
                    this.log.info(`FailureTask > process > DeleteRecipeDatasetFailed > error: ${JSON.stringify(err)}`);
                }
            }
        } catch (err) {
                    this.log.info(`FailureTask > process > No profile data detected > Skipping profile cleanup !!!`);
                }

        // Remove the profile job
        try {
            await this.dataBrewClient.send(new DeleteJobCommand({
                Name: `df-${id}-dataProfile`
            }));
        } catch (err) {
            this.log.info(`FailureTask > process > DeleteProfileJobFailed > error: ${JSON.stringify(err)}`);
        }

        // Remove the profile data set
        try {
            await this.dataBrewClient.send(new DeleteDatasetCommand({
                Name: `${id}-profileDataSet`
            }));
        } catch (err) {
            this.log.info(`FailureTask > process > DeleteProfileDatasetFailed > error: ${JSON.stringify(err)}`);
        }

        const asset: DataAssetTask = {
            dataAsset: payload.dataAsset
        };

        await this.s3Utils.putTaskData(TaskType.FailureTask, id, asset);
        const signedUrl = await this.s3Utils.getTaskDataSignedUrl(TaskType.FailureTask, id, 3600);

        const response: CreateResponseEventDetails = {
            id: payload.dataAsset.id,
            catalog: payload.dataAsset.catalog,
            workflow: payload.dataAsset.workflow,
            workflowState: 'FAILED',
            hubTaskToken: payload.dataAsset.execution.hubTaskToken,
            fullPayloadSignedUrl: signedUrl,
            dataProfileSignedUrl: signedUrl,
            dataQualityProfileSignedUrl: signedUrl

        }


        const publishEvent = new EventBridgeEventBuilder()
            .setEventBusName(this.eventBusName)
            .setSource(DATA_ASSET_SPOKE_EVENT_SOURCE)
            .setDetailType(DATA_ASSET_SPOKE_CREATE_RESPONSE_EVENT)
            .setDetail(response);

        await this.eventPublisher.publish(publishEvent);

        this.log.info(`FailureTask > process > exit:`);

    }


}
