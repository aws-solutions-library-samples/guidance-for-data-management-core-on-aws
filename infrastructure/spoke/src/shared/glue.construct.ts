import { Database } from '@aws-cdk/aws-glue-alpha';
import { Construct } from "constructs";


export interface GlueSpokeConstructProperties {
	accountId: string;
  region:string
}

export class GlueSpoke extends Construct {
  public readonly glueDatabaseName: string;
  public readonly glueDatabaseArn: string;

  constructor(
    scope: Construct,
    id: string,
    props: GlueSpokeConstructProperties
  ) {
    super(scope, id);


    
		const databaseName = `dm-spoke-${props.accountId}-${props.region}`;

    const glueDatabase = new Database(this,`${databaseName}`,{
      databaseName: databaseName,
      description: `The DM spokes glue database used for internal functionality`
    });

    this.glueDatabaseName = glueDatabase.databaseName;
    this.glueDatabaseArn = glueDatabase.databaseArn;
  }
}
