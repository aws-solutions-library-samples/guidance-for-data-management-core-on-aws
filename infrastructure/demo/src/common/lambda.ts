import { Architecture, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunctionProps, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const commonLambdaOptions: Pick<NodejsFunctionProps, 'bundling' | 'depsLockFilePath' | 'architecture' | 'runtime' | 'tracing'> = {
	runtime: Runtime.NODEJS_20_X,
	tracing: Tracing.ACTIVE,
	bundling: {
		minify: true,
		format: OutputFormat.ESM,
		target: 'node20.11',
		sourceMap: false,
		sourcesContent: false,
		banner: "import { createRequire } from 'module';const require = createRequire(import.meta.url);import { fileURLToPath } from 'url';import { dirname } from 'path';const __filename = fileURLToPath(import.meta.url);const __dirname = dirname(__filename);",
		externalModules: ['aws-sdk'],
	},
	depsLockFilePath: path.join(__dirname, '../../../../common/config/rush/pnpm-lock.yaml'),
	architecture: Architecture.ARM_64,
};
