import type { DataAssetTaskResource, DataAssetTaskResourceListOptions } from "./schemas.js";
import type { BaseLogger } from "pino";
import { createDelimitedAttribute, DocumentDbClientItem } from "@df/dynamodb-utils";
import { PkType } from "../../common/pkUtils.js";
import { DynamoDBDocumentClient, GetCommand, PutCommand, PutCommandInput, ScanCommand, ScanCommandInput } from "@aws-sdk/lib-dynamodb";

export class DataAssetTaskRepository {

    constructor(private readonly log: BaseLogger, private readonly dynamoDBClient: DynamoDBDocumentClient, private readonly tableName: string) {
    }

    public async get(taskId: string): Promise<DataAssetTaskResource | undefined> {
        this.log.info(`DataAssetTaskRepository> get> taskId: ${taskId}`);

        const taskIdKey = createDelimitedAttribute(PkType.DataAssetTask, taskId)

        const response = await this.dynamoDBClient.send(new GetCommand({
            TableName: this.tableName,
            Key: {
                pk: taskIdKey
            }
        }));
        if (response.Item === undefined) {
            this.log.debug(`DataAssetTaskRepository> get> early exit: undefined`);
            return undefined;
        }
        this.log.debug(`DataAssetTaskRepository> list> response:${JSON.stringify(response)}`);
        return this.assemble(response.Item);
    }

    public async list(options: DataAssetTaskResourceListOptions): Promise<[DataAssetTaskResource[], string]> {
        this.log.info(`DataAssetTaskRepository> list> options:${JSON.stringify(options)}`);
        const scanCommandParams: ScanCommandInput = {
            TableName: this.tableName,
            Limit: options?.count,
            ExclusiveStartKey: options?.lastEvaluatedToken ? {
                pk: options.lastEvaluatedToken
            } : undefined
        };

        try {
            const response = await this.dynamoDBClient.send(new ScanCommand(scanCommandParams));
            this.log.debug(`DataAssetTaskRepository> list> response:${JSON.stringify(response)}`);
            return [this.assembleTaskResourceList(response.Items), response?.LastEvaluatedKey?.['pk']];
        } catch (err) {
            if (err instanceof Error) {
                this.log.error(err);
                throw err;
            }
        }
        this.log.info(`DataAssetTaskRepository> list> exit`);
        return [[], undefined];
    }

    public async create(dataAssetTask: DataAssetTaskResource): Promise<void> {
        this.log.info(`DataAssetTaskRepository> create> dataAsset:${JSON.stringify(dataAssetTask)}`);
        const taskIdKey = createDelimitedAttribute(PkType.DataAssetTask, dataAssetTask.id);
        const params: PutCommandInput = {
            TableName: this.tableName,
            Item: {
                pk: taskIdKey,
                ...dataAssetTask
            }
        };

        try {
            const response = await this.dynamoDBClient.send(new PutCommand(params));
            this.log.debug(`DataAssetTaskRepository> create> response:${JSON.stringify(response)}`);
        } catch (err) {
            if (err instanceof Error) {
                this.log.error(err);
                throw err;
            }
        }
        this.log.info(`DataAssetTaskRepository> create> exit`);
    }

    private assembleTaskResourceList(items: Record<string, any>[]): DataAssetTaskResource[] {
        this.log.trace(`DataAssetTaskRepository> assembleTaskResourceList> in> items:${JSON.stringify(items)}`);

        const dataAssetTaskResourceList = [];
        for (const item of items) {
            dataAssetTaskResourceList.push(this.assemble(item));
        }
        this.log.trace(`DataAssetTaskRepository> assembleTaskResourceList> exit>  dataAssetTaskResourceList:${JSON.stringify(dataAssetTaskResourceList)}`);

        return dataAssetTaskResourceList;
    }

    private assemble(item: DocumentDbClientItem): DataAssetTaskResource | undefined {
        this.log.trace(`DataAssetTaskRepository> assemble> in> item:${JSON.stringify(item)}`);

        if (item === undefined) {
            return undefined;
        }
        this.log.trace(`DataAssetTaskRepository> assembler> exit>`);

        return {
            id: item['id'],
            status: item['status'],
            idcUserId: item['idcUserId'],
            catalog: item['catalog'],
            workflow: item['workflow'],
        };
    }

}
