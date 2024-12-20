import { Construct } from 'constructs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

export interface SSMConstructProperties {
}
// Access Control Parameters
export const accessControlApiFunctionNameParameter = `/dm/accessControl/apiFunctionName`;
// Data Lineage Parameters
export const dataLineageApiFunctionNameParameter = `/dm/dataLineage/apiFunctionName`;



// Data Quality Parameters
export const dataQualityApiFunctionNameParameter = `/dm/dataQuality/apiFunctionName`;


export class SSM extends Construct {

	constructor(scope: Construct, id: string) {
		super(scope, id);

		const namePrefix = `dm`;

		new StringParameter(this, 'accessControlApiFunctionNameParameter', {
			parameterName: accessControlApiFunctionNameParameter,
			stringValue: `${namePrefix}-accessControlApi`,
		});

		/*
			* Data Lineage parameters
		*/

		new StringParameter(this, 'dataLineageApiFunctionNameParameter', {
			parameterName: dataLineageApiFunctionNameParameter,
			stringValue: `${namePrefix}-dataLineageApi`,
		});

		/*
			* Data Quality parameters
		*/
		new StringParameter(this, 'dataQualityApiFunctionNameParameter', {
			parameterName: dataQualityApiFunctionNameParameter,
			stringValue: `${namePrefix}-dataQualityApi`,
		});

	}
}
