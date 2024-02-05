import * as cdk from 'aws-cdk-lib';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { IVpc } from 'aws-cdk-lib/aws-ec2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { NagSuppressions } from 'cdk-nag';

export interface SdfVpcConfig {
    vpcId: string;
    isolatedSubnetIds: string[]
}

export interface NetworkConstructProperties {
    domain: string;
    deleteBucket?: boolean;
    userVpcConfig?: SdfVpcConfig;
}

export const accessLogBucketNameParameter = (domain: string) => `/sdf/shared/${domain}/s3/accessLogBucketName`;
export const vpcIdParameter = (domain: string) => `/sdf/shared/${domain}/network/vpcId`;

export const publicSubnetIdsParameter = (domain: string) => `/sdf/shared/${domain}/network/publicSubnets`;
export const publicSubnetIdListParameter = (domain: string) => `/sdf/shared/${domain}/network/publicSubnetList`;

export const privateSubnetIdsParameter = (domain: string) => `/sdf/shared/${domain}/network/privateSubnets`;
export const privateSubnetIdListParameter = (domain: string) => `/sdf/shared/${domain}/network/privateSubnetList`;

export const isolatedSubnetIdsParameter = (domain: string) => `/sdf/shared/${domain}/network/isolatedSubnets`;
export const isolatedSubnetIdListParameter = (domain: string) => `/sdf/shared/${domain}/network/isolatedSubnetList`;


export class Network extends Construct {
    public vpc: IVpc;
    public sdfVpcConfig: SdfVpcConfig;

    constructor(scope: Construct, id: string, props: NetworkConstructProperties) {
        super(scope, id);

        const accessLogBucketName = `sdf-access-logs-${props.domain}-${cdk.Stack.of(this).account}-${cdk.Stack.of(this).region}`;

        const accessLogBucket = new s3.Bucket(this, 's3AccessLog', {
            bucketName: accessLogBucketName,
            encryption: s3.BucketEncryption.S3_MANAGED,
            intelligentTieringConfigurations: [
                {
                    name: 'archive',
                    archiveAccessTierTime: Duration.days(90),
                    deepArchiveAccessTierTime: Duration.days(180)
                }
            ],
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            autoDeleteObjects: props.deleteBucket,
            versioned: !props.deleteBucket,
            removalPolicy: props.deleteBucket ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
        });

        new ssm.StringParameter(this, 'accessLogBucketNameParameter', {
            parameterName: accessLogBucketNameParameter(props.domain),
            stringValue: accessLogBucket.bucketName
        });

        NagSuppressions.addResourceSuppressions(accessLogBucket, [
            {
                id: 'AwsSolutions-S1',
                reason: 'This is only the access log not the log that contains the vpc traffic information.'
            }
        ]);

        if (props.userVpcConfig === undefined) {
            const vpc = new ec2.Vpc(this, 'Vpc', {
                subnetConfiguration: [
                    {
                        name: 'isolated-subnet',
                        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                        cidrMask: 24
                    },
                    {
                        name: 'private-subnet',
                        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                        cidrMask: 24
                    }, {
                        name: 'public-subnet',
                        subnetType: ec2.SubnetType.PUBLIC,
                        cidrMask: 24
                    }
                ]
            });


            const bucketName = `sdf-vpc-logs-${props.domain}-${cdk.Stack.of(this).account}-${cdk.Stack.of(this).region}`;

            // Create log bucket.
            const s3LogBucket = new s3.Bucket(this, 's3LogBucket', {
                bucketName,
                encryption: s3.BucketEncryption.S3_MANAGED,
                serverAccessLogsBucket: accessLogBucket,
                serverAccessLogsPrefix: `vpc-logs/`,
                intelligentTieringConfigurations: [
                    {
                        name: 'archive',
                        archiveAccessTierTime: Duration.days(90),
                        deepArchiveAccessTierTime: Duration.days(180)
                    }
                ],
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                enforceSSL: true,
                autoDeleteObjects: props.deleteBucket,
                removalPolicy: props.deleteBucket ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
                versioned: !props.deleteBucket,

            });

            const flowLogName = `sdf-${props.domain}-flowlogs`;

            // Add flow logs.
            const vpcFlowLogRole = new iam.Role(this, 'vpcFlowLogRole', {
                assumedBy: new iam.ServicePrincipal('vpc-flow-logs.amazonaws.com')
            });

            s3LogBucket.grantWrite(vpcFlowLogRole, `${flowLogName}/*`);

            NagSuppressions.addResourceSuppressions(vpcFlowLogRole, [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The role an only modify to a specific flowlog.',
                    appliesTo: ['Action::s3:Abort*', 'Action::s3:DeleteObject*', `Resource::<Networks3LogBucketD8B712E9.Arn>/sdf-${props.domain}-flowlogs/*`]
                }
            ], true);

            // Create flow logs to S3.
            new ec2.FlowLog(this, 'sharedVpcLowLogs', {
                destination: ec2.FlowLogDestination.toS3(s3LogBucket, `${flowLogName}/`),
                trafficType: ec2.FlowLogTrafficType.ALL,
                flowLogName: flowLogName,
                resourceType: ec2.FlowLogResourceType.fromVpc(vpc)
            });


            this.vpc = vpc;

            new ssm.StringParameter(this, 'vpcIdParameter', {
                parameterName: vpcIdParameter(props.domain),
                stringValue: this.vpc.vpcId
            });

            new ssm.StringParameter(this, 'publicSubnetIdsParameter', {
                parameterName: publicSubnetIdsParameter(props.domain),
                description: 'Public subnet IDs used for SDF.',
                stringValue: this.vpc.selectSubnets({subnetGroupName: 'public-subnet'}).subnets.map((o) => o.subnetId).join(',')
            });

            new ssm.StringListParameter(this, 'publicSubnetIdListParameter', {
                parameterName: publicSubnetIdListParameter(props.domain),
                description: 'Public subnet IDs used for SDF.',
                stringListValue: this.vpc.selectSubnets({subnetGroupName: 'public-subnet'}).subnets.map((o) => o.subnetId)
            });

            new ssm.StringParameter(this, 'privateSubnetIdsParameter', {
                parameterName: privateSubnetIdsParameter(props.domain),
                description: 'Private subnet IDs used for SDF.',
                stringValue: this.vpc.selectSubnets({subnetGroupName: 'private-subnet'}).subnets.map((o) => o.subnetId).join(',')
            });

            new ssm.StringListParameter(this, 'privateSubnetIdListParameter', {
                parameterName: privateSubnetIdListParameter(props.domain),
                description: 'Private subnet IDs used for SDF.',
                stringListValue: this.vpc.selectSubnets({subnetGroupName: 'private-subnet'}).subnets.map((o) => o.subnetId)
            });

            new ssm.StringParameter(this, 'isolatedSubnetIdsParameter', {
                parameterName: isolatedSubnetIdsParameter(props.domain),
                description: 'Isolated subnet IDs used for SDF.',
                stringValue: this.vpc.selectSubnets({subnetGroupName: 'isolated-subnet'}).subnets.map((o) => o.subnetId).join(',')
            });

            new ssm.StringListParameter(this, 'isolatedSubnetIdListParameter', {
                parameterName: isolatedSubnetIdListParameter(props.domain),
                description: 'Isolated subnet IDs used for SDF.',
                stringListValue: this.vpc.selectSubnets({subnetGroupName: 'isolated-subnet'}).subnets.map((o) => o.subnetId)
            });

            // TODO add MWAA endpoint


            this.sdfVpcConfig = {
                vpcId: this.vpc.vpcId,
                isolatedSubnetIds: this.vpc.selectSubnets({subnetGroupName: 'isolated-subnet'}).subnets.map((o) => o.subnetId)
            };

        } else {
            // user provided a VPC, use that
            this.vpc = ec2.Vpc.fromLookup(this, 'vpc', {vpcId: props.userVpcConfig?.vpcId});

            new ssm.StringParameter(this, 'vpcIdParameter', {
                parameterName: vpcIdParameter(props.domain),
                stringValue: this.vpc.vpcId
            });

            new ssm.StringParameter(this, 'isolatedSubnetIdsParameter', {
                parameterName: isolatedSubnetIdsParameter(props.domain),
                description: 'Isolated subnet IDs used for SDF.',
                stringValue: props.userVpcConfig.isolatedSubnetIds.join(',')
            });


            new ssm.StringListParameter(this, 'isolatedSubnetIdListParameter', {
                parameterName: isolatedSubnetIdListParameter(props.domain),
                description: 'Isolated subnet IDs used for SDF.',
                stringListValue: props.userVpcConfig.isolatedSubnetIds
            });


            this.sdfVpcConfig = {
                vpcId: this.vpc.vpcId,
                isolatedSubnetIds: props.userVpcConfig.isolatedSubnetIds
            };
        }
    }
}
