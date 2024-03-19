import type { BaseLogger } from 'pino';
import { CreateDataQualityRulesetCommand, GlueClient, StartDataQualityRulesetEvaluationRunCommand, UpdateDataQualityRulesetCommand } from '@aws-sdk/client-glue';
import { CustomDatasetInput, DATA_LINEAGE_DIRECT_SPOKE_INGESTION_REQUEST_EVENT, DATA_LINEAGE_SPOKE_EVENT_SOURCE, EventBridgeEventBuilder, EventPublisher, OpenLineageBuilder, RunEvent } from "@df/events";
import type { S3Utils } from "../../../../common/s3Utils.js";
import type { DataAssetTask } from '../../models.js';
import { TaskType } from "../../models.js";
import { getConnectionType } from "../../../../common/utils.js";

export class DataQualityProfileJobTask {

    constructor(private readonly log: BaseLogger,
                private readonly glueClient: GlueClient,
                private readonly GlueDbName: string,
                private readonly s3Utils: S3Utils,
                private readonly hubEventBusName:string,
                private readonly eventPublisher: EventPublisher) {
    }

    public async process(event: DataAssetTask): Promise<any> {
        this.log.info(`DataQualityProfileJobTask > process > in > event: ${JSON.stringify(event)}`);

        const asset = event.dataAsset;
        const id = (asset.catalog?.assetId) ? asset.catalog.assetId : asset.id
        const jobName = `df-createDataQualityProfile-${id}`;

        const qualityRulesetCommandPayload = {
            Name: jobName,
            Ruleset: event.dataAsset.workflow.dataQuality.ruleset,
            Description: 'Data quality ruleset generated by Data Fabric.',
        }

        /**
         * Create the DataQualityRuleSet if it does not exist
         */
        try {
            await this.glueClient.send(new CreateDataQualityRulesetCommand({
                ...qualityRulesetCommandPayload,
                Tags: {
                    id: event.dataAsset.id,
                }
            }))

        } catch (e) {
            if (e.name === 'InvalidInputException' && e.message.includes('A resource with the same resourceName but a different internalId already exists')) {
                this.log.debug(`DataQualityProfileJobTask > process > ${e.message}`);
                await this.glueClient.send(new UpdateDataQualityRulesetCommand(qualityRulesetCommandPayload))
            } else {
                this.log.error(`DataQualityProfileJobTask > process > error: ${JSON.stringify(e)}`);
                throw e;
            }
        }

        /**
         * Run the DataQualityRulesetEvaluation
         */
        const startDataQualityRulesetEvaluationResponse = await this.glueClient.send(new StartDataQualityRulesetEvaluationRunCommand({
            RulesetNames: [jobName],
            DataSource: {
                GlueTable: {
                    TableName: event.dataAsset.execution.glueTableName,
                    DatabaseName: this.GlueDbName,
                }
            },
            Role: asset.workflow.roleArn
        }))

        event.dataAsset.lineage.dataQualityProfile = this.constructDataLineage(event, startDataQualityRulesetEvaluationResponse.RunId, jobName);

        const openLineageEvent = new EventBridgeEventBuilder()
            .setEventBusName(this.hubEventBusName)
            .setSource(DATA_LINEAGE_SPOKE_EVENT_SOURCE)
            .setDetailType(DATA_LINEAGE_DIRECT_SPOKE_INGESTION_REQUEST_EVENT)
            .setDetail(event.dataAsset.lineage.dataQualityProfile);

        await this.eventPublisher.publish(openLineageEvent);

        this.log.info(`DataQualityProfileJobTask > process > dataQualityProfileTaskStartEvent: ${JSON.stringify(event.dataAsset.lineage.dataQualityProfile)}`);

        await this.s3Utils.putTaskData(TaskType.DataQualityProfileTask, id, event);

        this.log.info(`DataQualityProfileJobTask > process > exit:`);
    }

    private constructDataLineage(event: DataAssetTask, runId: string, rulesetName: string): Partial<RunEvent> {
        this.log.info(`DataQualityProfileJobTask > constructDataLineage > in> event: ${event}, runId: ${runId}`);

        const {catalog, workflow, execution} = event?.dataAsset;

        const openlineageBuilder = new OpenLineageBuilder();

        const customInput: CustomDatasetInput = {
            type: 'Custom',
            name: workflow.dataset.name,
            dataSource: workflow?.dataset?.dataSource,
            storage: {
                fileFormat: event.dataAsset.workflow?.dataset?.format,
                storageLayer: getConnectionType(event.dataAsset.workflow)
            },
            producer: event.dataAsset.execution.hubStateMachineArn,
        };

        openlineageBuilder
            .setContext(catalog.domainId, catalog.domainName, rulesetName)
            .setJob(
                {
                    jobName: TaskType.DataQualityProfileTask,
                    assetName: catalog.assetName,
                })
            .setStartJob(
                {
                    executionId: runId,
                    startTime: new Date().toISOString(),
                    parent: {
                        name: TaskType.Root,
                        assetName: catalog.assetName,
                        producer: execution.hubStateMachineArn,
                        runId: execution.hubExecutionId,
                    }
                })
            .setDatasetInput(customInput);

        return openlineageBuilder.build();
    }
}
