import { describe, it } from "vitest";
import { StartTask } from "./startTask.js";
import pino from "pino";
import { EventPublisher } from "@dm/events";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { DataZoneUserAuthClientFactory } from "../../../../plugins/module.awilix.js";
import { STSClient } from "@aws-sdk/client-sts";

describe('StartTask', () => {
    let task: StartTask;

    it('should emit the lineage event properly', async () => {
        const logger = pino.default(
            pino.destination({
                sync: true // test frameworks must use pino logger in sync mode!
            })
        );

        task = new StartTask(logger, '', new EventPublisher(logger, new EventBridgeClient({}), '', ''), new DataZoneUserAuthClientFactory(logger, 'us-west-2', new STSClient({}), ''));

        await task.process({
            dataAsset: {
                id: "",
                idcUserId: "",
                catalog: {
                    domainId: "1111",
                    domainName: "sample_domain_name",
                    projectId: "",
                    environmentId: "",
                    region: "",
                    assetName: "sample_output",
                    assetId: "",
                    accountId: "",
                    autoPublish: false
                },
                workflow: {
                    name: "",
                    roleArn: "",
                    dataset: {
                        "name": "redshift-automated-test-epc13",
                        format: "avro",
                        connection: {
                            "redshift": {
                                "secretArn": "arn:aws:secretsmanager:us-west-2:767397875118:secret:redshift!dm-redshift-test-namespace-admin-9rP6W5",
                                "jdbcConnectionUrl": "jdbc:redshift://dm-redshift-test-workgroup.767397875118.us-west-2.redshift-serverless.amazonaws.com:5439/dev",
                                "subnetId": "subnet-05769b1803a56904e",
                                "securityGroupIdList": ["sg-00de20bbf3a80426d"],
                                "availabilityZone": "us-west-2c",
                                "path": "dev/public/ski_resorts",
                                "databaseTableName": "public.ski_resorts"
                            }
                        }
                    },

                },
                lineage: {
                    root: undefined,
                    dataProfile: undefined,
                    dataQualityProfile: undefined
                }
            },
            execution: {
                executionId: "341cf762-b25d-49ce-9e82-f82986337594",
                executionStartTime: new Date().toISOString(),
                stateMachineArn: "arn:aws:states:ap-southeast-2:033295216537:stateMachine:dm-data-asset"
            }
        })
    })

});
