import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Cluster } from "aws-cdk-lib/aws-ecs";
import type { IVpc } from "aws-cdk-lib/aws-ec2";

export interface ComputeConstructProperties {
    vpc: IVpc;
}

export const clusterNameParameter = `/dm/shared/clusterName`;

export class Compute extends Construct {
    constructor(scope: Construct, id: string, props: ComputeConstructProperties) {
        super(scope, id);

        const namePrefix = `dm`;

        const computeCluster = new Cluster(this, 'DMComputeCluster', {
            vpc: props.vpc,
            clusterName: `${namePrefix}-cluster`,
            containerInsights: true
        });

        new ssm.StringParameter(this, 'clusterNameParameter', {
            parameterName: clusterNameParameter,
            stringValue: computeCluster.clusterName,
        });
    }
}
