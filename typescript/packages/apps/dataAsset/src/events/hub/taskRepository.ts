import type { BaseLogger } from "pino";
import { createDelimitedAttribute } from "@df/dynamodb-utils";
import { PkType } from "../../common/pkUtils.js";
import { DynamoDBDocumentClient, UpdateCommandInput, UpdateCommand } from "@aws-sdk/lib-dynamodb";

export class DataAssetTaskStatusRepository {

    constructor(private readonly log: BaseLogger, private readonly dynamoDBClient: DynamoDBDocumentClient, private readonly tableName: string) {
    }

    public async updateTaskStatus(taskId: string, status: string): Promise<void> {
        this.log.info(`DataAssetTaskRepository> updateTaskStatus> in: taskId: ${taskId}, status: ${status}`);

        const taskIdKey = createDelimitedAttribute(PkType.DataAssetTask, taskId);

        const params: UpdateCommandInput = {
            TableName: this.tableName,
            Key: {
                pk: taskIdKey
            },
            UpdateExpression: "set #status = :status",
            ExpressionAttributeNames: {
                "#status": "status"
            },
            ExpressionAttributeValues: {
                ":status": status
            }
        };

        await this.dynamoDBClient.send(new UpdateCommand(params));

        this.log.info(`DataAssetTaskRepository> updateTaskStatus> exit:`);
    }
}
