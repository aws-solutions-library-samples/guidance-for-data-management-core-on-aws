import type { DataQualityResultsAvailableEvent, RuleResult, RunEvent } from "@dm/events";
import {  DATA_LINEAGE_DIRECT_SPOKE_INGESTION_REQUEST_EVENT, DATA_LINEAGE_SPOKE_EVENT_SOURCE, EventBridgeEventBuilder, EventPublisher, OpenLineageBuilder } from "@dm/events";
import type { BaseLogger } from "pino";
import type { SFNClient } from "@aws-sdk/client-sfn";
import { SendTaskSuccessCommand } from "@aws-sdk/client-sfn";
import { GetDataQualityResultCommand, GetDataQualityRulesetEvaluationRunCommand, GetTagsCommand, GlueClient } from "@aws-sdk/client-glue";
import { validateNotEmpty } from "@dm/validators";
import type { S3Utils } from "../../common/s3Utils.js";
import { TaskType } from "../../stepFunction/tasks/models.js";

export class DataQualityProfileEventProcessor {

    constructor(private readonly log: BaseLogger,
                private readonly sfnClient: SFNClient,
                private readonly s3Utils: S3Utils,
                private readonly glueClient: GlueClient,
                private readonly hubEventBusName:string,
                private readonly eventPublisher: EventPublisher) {
    }

    public async dataQualityProfileCompletionEvent(event: DataQualityResultsAvailableEvent) {
        this.log.info(`DataQualityProfileEventProcessor > dataQualityProfileCompletionEvent >in  event: ${JSON.stringify(event)}`);

        validateNotEmpty(event, 'Data Quality Profile Completion event');
        validateNotEmpty(event.detail.rulesetNames, 'Data Quality Ruleset Names');

        const {rulesetNames, resultId, context} = event.detail;

        /**
         * There will only one ruleset configured by Data Management
         */
        const rulesetName = rulesetNames[0];
        const rulesetArn = `arn:aws:glue:${event.region}:${event.account}:dataQualityRuleset/${rulesetName}`;

        const [getTagsResponse, getEvaluationResponse, getResultResponse] = await Promise.all([
            /**
             * Request Id needed to query the SSM parameters is stored in the tag
             */
            this.glueClient.send(new GetTagsCommand({
                ResourceArn: rulesetArn
            })),
            /**
             * Evaluation Run contains the run start and end time
             */
            this.glueClient.send(new GetDataQualityRulesetEvaluationRunCommand({
                RunId: context.runId
            })),
            /**
             * Data Quality Result contains list of assertion details
             */
            this.glueClient.send(new GetDataQualityResultCommand({
                ResultId: resultId
            }))
        ])

        const id = getTagsResponse.Tags['id'];

        const dataAssetTask = await this.s3Utils.getTaskData(TaskType.DataQualityProfileTask, id);
        
        await this.s3Utils.putDataQualityProfilingResults(dataAssetTask.dataAsset.id, dataAssetTask.dataAsset.catalog.domainId, dataAssetTask.dataAsset.catalog.projectId, getResultResponse);

        const {rulesFailed, rulesSucceeded, rulesSkipped, score} = event.detail
        dataAssetTask.dataAsset.execution = {
            ...dataAssetTask.dataAsset.execution,
            dataQualityProfileJob: {
                id: context.runId,
                status: event.detail.state,
                stopTime: getEvaluationResponse.CompletedOn.toISOString(),
                startTime: getEvaluationResponse.StartedOn.toISOString(),
                message: `Rule Failed: ${rulesFailed}. Rule Skipped:${rulesSkipped}, Rule Succeeded: ${rulesSucceeded}, Score: ${score}`,
                outputPath: this.s3Utils.getDataQualityProfilingJobOutputPath(id, dataAssetTask.dataAsset.catalog.domainId, dataAssetTask.dataAsset.catalog.projectId)
            }
        }

        const dataQualityProfileLineageEvent = dataAssetTask.dataAsset?.lineage?.dataQualityProfile;
        if (!dataQualityProfileLineageEvent) {
            throw new Error('No start lineage event for data quality.')
        }
        dataAssetTask.dataAsset.lineage.dataQualityProfile = this.constructDataLineage(dataQualityProfileLineageEvent, getResultResponse.RuleResults, rulesetArn);

        await this.s3Utils.putTaskData(TaskType.DataQualityProfileTask, id, dataAssetTask);

        const openLineageEvent = new EventBridgeEventBuilder()
            .setEventBusName(this.hubEventBusName)
            .setSource(DATA_LINEAGE_SPOKE_EVENT_SOURCE)
            .setDetailType(DATA_LINEAGE_DIRECT_SPOKE_INGESTION_REQUEST_EVENT)
            .setDetail(dataAssetTask.dataAsset.lineage.dataQualityProfile);

        await this.eventPublisher.publish(openLineageEvent);

        this.log.info(`DataQualityProfileEventProcessor > dataQualityProfileCompletionEvent > dataQualityProfileTaskCompleteEvent: ${JSON.stringify(dataAssetTask.dataAsset.lineage.dataQualityProfile)}`);

        this.log.info(`DataQualityProfileEventProcessor > dataQualityProfileCompletionEvent > before sfnClient.send`);
        // Signal back to the state machine
        await this.sfnClient.send(new SendTaskSuccessCommand({output: JSON.stringify(dataAssetTask), taskToken: dataAssetTask.execution.taskToken}));
    }

    private constructDataLineage(lineageEvent: Partial<RunEvent>, ruleResults: RuleResult[], rulesetName: string): Partial<RunEvent> {
        this.log.info(`JobEventProcessor > constructDataLineage > in> lineageEvent: ${lineageEvent}, ruleResults: ${ruleResults}`);
        const openLineageBuilder = new OpenLineageBuilder();
        openLineageBuilder
            .setOpenLineageEvent(lineageEvent)
            .setQualityResult({
                producer: rulesetName,
                result: {
                    ruleResults
                }
            }).setEndJob(
            {
                endTime: new Date().toISOString(),
                eventType: "COMPLETE"
            });
        return openLineageBuilder.build();
    }
}
