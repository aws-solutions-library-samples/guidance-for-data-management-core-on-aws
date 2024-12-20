/*
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import awilix, {  asValue } from 'awilix';
import { pino, type BaseLogger, type LoggerOptions } from 'pino';


const logger: BaseLogger = pino(
);

// Create the container and set the injectionMode to PROXY (which is also the default).
const container = awilix.createContainer({
	injectionMode: awilix.InjectionMode.PROXY,
});

// const awsRegion = process.env['AWS_REGION'];

// const commonInjectionOptions = {
// 	lifetime: Lifetime.SINGLETON,
// };


container.register({
	logger: asValue(logger),
	// lambdaClient: asFunction(() => LambdaClientFactory.create(awsRegion), {
	// 	...commonInjectionOptions,
	// }),
	// lambdaInvoker: asFunction((container) => new Invoker(logger, container.lambdaClient), {
	// 	...commonInjectionOptions,
	// }),

});

export { container };
