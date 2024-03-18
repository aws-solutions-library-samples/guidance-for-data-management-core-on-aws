import type { CrawlerStateChangeEvent, CustomDatasetInput, RunEvent } from '@df/events';
import { OpenLineageBuilder } from '@df/events';
import { validateNotEmpty } from '@df/validators';
import type { BaseLogger } from 'pino';
import { GetTagsCommand, GlueClient, ListCrawlsCommand } from '@aws-sdk/client-glue';
import { SendTaskSuccessCommand, type SFNClient } from '@aws-sdk/client-sfn';
import { type DataAssetTask, TaskType } from '../../stepFunction/tasks/models.js';
import { getConnectionType } from '../../common/utils.js';
import type { S3Utils } from '../../common/s3Utils.js';

export class GlueCrawlerEventProcessor {
    constructor(
        private log: BaseLogger,
        private glueClient: GlueClient,
        private sfnClient: SFNClient,
        private s3Utils: S3Utils
    ) {
    }

    // This event needs to move to the spoke app
    public async completionEvent(event: CrawlerStateChangeEvent): Promise<void> {
        this.log.info(`GlueCrawlerEventProcessor > completionEvent >in  event: ${JSON.stringify(event)}`);

        validateNotEmpty(event, 'Crawler completion event');

        //Get the Crawler tags
        const crawler = await this.glueClient.send(new GetTagsCommand({ResourceArn: `arn:aws:glue:${event.region}:${event.account}:crawler/${event.detail.crawlerName}`}));

        // Use assetId if it exists else no asset exists so use the requestId
        const id = (crawler.Tags?.['assetId']) ? crawler.Tags['assetId'] : crawler.Tags['requestId'];

        //Get the task payload
        const taskOutput: DataAssetTask = await this.s3Utils.getTaskData(TaskType.GlueCrawlerTask, id);

        //Has there been a table update if so update the task output & lineage
        taskOutput.dataAsset['glueDeltaDetected'] = false;
        if (
            event.detail.tablesCreated > 0 || event.detail.partitionsCreated > 0
            || event.detail.tablesUpdated > 0 || event.detail.partitionsUpdated > 0
            || event.detail.tablesDeleted > 0 || event.detail.partitionsDeleted > 0
        ) {
            taskOutput.dataAsset['glueDeltaDetected'] = true;

            // Construct the data lineage
            if (!taskOutput?.dataAsset.lineage) {
                taskOutput.dataAsset.lineage = {};
            }

            const tableName = await this.getTableName(event.detail.crawlerName);
            taskOutput.dataAsset.lineage[`${TaskType.GlueCrawlerTask}-${id}`] = this.constructLineage(id, taskOutput, event, tableName);
            // Update the tableName
            taskOutput.dataAsset.execution.glueTableName = tableName;
        }

        taskOutput.dataAsset.execution.crawlerRun = {
            id: event.detail.crawlerName,
            status: event.detail.state,
            message: event.detail.message,
            stopTime: event.detail.completionDate
        }

        await this.s3Utils.putTaskData(TaskType.GlueCrawlerTask, id, taskOutput)

        await this.sfnClient.send(new SendTaskSuccessCommand({output: JSON.stringify(taskOutput), taskToken: taskOutput.execution.taskToken}));

        this.log.info(`GlueCrawlerEventProcessor > completionEvent >exit taskOutput:${JSON.stringify(taskOutput)}`);
        return;
    }

    private async getTableName(crawlerName: string): Promise<string> {
        this.log.debug(`GlueCrawlerEventProcessor > getTableName >in`);

        const crawlResults = await this.glueClient.send(new ListCrawlsCommand({
            CrawlerName: crawlerName,
            MaxResults: 1
        }));

        const summary = JSON.parse(crawlResults.Crawls[0].Summary);
        const details = JSON.parse(summary['TABLE']['ADD']);

        this.log.debug(`GlueCrawlerEventProcessor > getTableName >exit TableName:${details['Details']['names'][0]}`);
        return details['Details']['names'][0];
    }

    private constructLineage(id: string, dataAssetTask: DataAssetTask, event: CrawlerStateChangeEvent, tableName: string): Partial<RunEvent> {
        const asset = dataAssetTask.dataAsset;

        const customInput: CustomDatasetInput = {
            type: 'Custom',
            dataSource: {
                url: asset.catalog.assetName,
                name: asset.catalog.assetName
            },
            storage: {
                fileFormat: asset.workflow?.dataset?.format,
                storageLayer: getConnectionType(asset.workflow)
            },
            name: asset.catalog.assetName,
            producer: 'TODO User info'
        };

        const builder = new OpenLineageBuilder();
        return builder
            .setContext(asset.catalog.domainId, asset.catalog.domainName, asset.execution.hubExecutionArn)
            .setJob(
                {
                    // Supplied by StateMachine task
                    jobName: `df_glue_crawler_${id}`,
                    // Supplied by user
                    assetName: asset.catalog.assetName
                })
            .setStartJob(
                {
                    executionId: event.detail.crawlerName,
                    startTime: new Date(new Date().getTime() - (event.detail['runningTime (sec)'] * 1000)).toISOString()
                })
            .setDatasetInput(customInput)
            .setDatasetOutput({
                name: tableName,
                storageLayer: 'glue'
            })
            .setEndJob({
                endTime: new Date().toISOString(),
                eventType: 'COMPLETE'
            })
            .build();

    }

}