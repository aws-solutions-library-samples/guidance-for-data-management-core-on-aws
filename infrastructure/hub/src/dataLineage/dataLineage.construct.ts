import { Construct } from 'constructs';
import { CfnEventBusPolicy, EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { AnyPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Duration, Stack } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { dmEventBusName, getLambdaArchitecture, OrganizationUnitPath } from '@dm/cdk-common';
import { DATA_LINEAGE_DIRECT_HUB_INGESTION_REQUEST_EVENT, DATA_LINEAGE_DIRECT_SPOKE_INGESTION_REQUEST_EVENT, DATA_LINEAGE_HUB_EVENT_SOURCE, DATA_LINEAGE_SPOKE_EVENT_SOURCE } from '@dm/events';
import { fileURLToPath } from 'url';
import path from 'path';
import type { IVpc } from 'aws-cdk-lib/aws-ec2';
import { NagSuppressions } from 'cdk-nag';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DataLineageConstructProperties {
    orgPath: OrganizationUnitPath,
    vpc: IVpc;
    marquezUrl: string;
}


export class DataLineage extends Construct {
    public readonly userPoolId: string;

    constructor(scope: Construct, id: string, props: DataLineageConstructProperties) {
        super(scope, id);

        const namePrefix = `dm`;
        const eventBus = EventBus.fromEventBusName(this, 'HubEventBus', dmEventBusName);
        const accountId = Stack.of(this).account;
        const region = Stack.of(this).region;


        const deadLetterQueue = new Queue(this, 'DeadLetterQueue');
        deadLetterQueue.addToResourcePolicy(new PolicyStatement({
            sid: 'enforce-ssl',
            effect: Effect.DENY,
            principals: [new AnyPrincipal()],
            actions: ['sqs:*'],
            resources: [deadLetterQueue.queueArn],
            conditions: {
                'Bool': {
                    'aws:SecureTransport': 'false'
                }
            }
        }));


        const lineageIngestionEventLambda = new NodejsFunction(this, 'LineageIngestionEventLambda', {
            description: `Data Lineage Ingestion Event Handler`,
            entry: path.join(__dirname, '../../../../typescript/packages/apps/dataLineage/src/lambda_eventbridge.ts'),
            runtime: Runtime.NODEJS_20_X,
            tracing: Tracing.ACTIVE,
            functionName: `${namePrefix}-dataLineage-ingestion-event`,
            timeout: Duration.seconds(30),
            memorySize: 512,
            logRetention: RetentionDays.ONE_WEEK,
            environment: {
                EVENT_BUS_NAME: dmEventBusName,
                MARQUEZ_URL: props.marquezUrl
            },
            vpc: props.vpc,
            vpcSubnets: {subnets: props.vpc.privateSubnets},
            bundling: {
                minify: true,
                format: OutputFormat.ESM,
                target: 'node20',
                sourceMap: false,
                sourcesContent: false,
                banner: 'import { createRequire } from \'module\';const require = createRequire(import.meta.url);import { fileURLToPath } from \'url\';import { dirname } from \'path\';const __filename = fileURLToPath(import.meta.url);const __dirname = dirname(__filename);',
                externalModules: ['aws-sdk', 'pg-native']
            },
            depsLockFilePath: path.join(__dirname, '../../../../common/config/rush/pnpm-lock.yaml'),
            architecture: getLambdaArchitecture(scope)
        });

        const dataLineageIngestionRule = new Rule(this, 'DataLineageIngestionRule', {
            eventBus: eventBus,
            eventPattern: {
                source: [
                    DATA_LINEAGE_SPOKE_EVENT_SOURCE,
                    DATA_LINEAGE_HUB_EVENT_SOURCE
                ],
                detailType: [
                    DATA_LINEAGE_DIRECT_SPOKE_INGESTION_REQUEST_EVENT,
                    DATA_LINEAGE_DIRECT_HUB_INGESTION_REQUEST_EVENT
                ]
            }
        });

        dataLineageIngestionRule.addTarget(
            new LambdaFunction(lineageIngestionEventLambda, {
                deadLetterQueue: deadLetterQueue,
                maxEventAge: Duration.minutes(5),
                retryAttempts: 2
            })
        );

        new CfnEventBusPolicy(this, 'DataLineageEventBusPolicy', {
            eventBusName: dmEventBusName,
            statementId: 'AllowSpokeAccountsToPutLineageEvents',
            statement: {
                Effect: Effect.ALLOW,
                Action: ['events:PutEvents'],
                Resource: [`arn:aws:events:${region}:${accountId}:event-bus/${dmEventBusName}`],
                Principal: '*',
                Condition: {
                    'StringEquals': {
                        'events:source': [DATA_LINEAGE_SPOKE_EVENT_SOURCE, DATA_LINEAGE_HUB_EVENT_SOURCE]
                    },
                    'ForAnyValue:StringEquals': {
                        'aws:PrincipalOrgPaths': `${props.orgPath.orgId}/${props.orgPath.rootId}/${props.orgPath.ouId}/`
                    }
                }
            }
        });

        NagSuppressions.addResourceSuppressions([deadLetterQueue],
            [
                {
                    id: 'AwsSolutions-SQS3',
                    reason: 'This is the dead letter queue.'

                }
            ],
            true);

        NagSuppressions.addResourceSuppressions([lineageIngestionEventLambda],
            [
                {
                    id: 'AwsSolutions-L1',
                    reason: 'Latest runtime not needed.'
                },
                {
                    id: 'AwsSolutions-IAM4',
                    appliesTo: [
                        'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                        'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole'
                    ],
                    reason: 'This policy is the one generated by CDK.'

                },
                {
                    id: 'AwsSolutions-IAM5',
                    appliesTo: ['Resource::*'],
                    reason: 'The resource condition in the IAM policy is generated by CDK, this only applies to xray:PutTelemetryRecords and xray:PutTraceSegments.'
                }
            ],
            true);

    }
}
