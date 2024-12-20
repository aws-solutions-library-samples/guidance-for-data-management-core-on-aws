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

import { container } from '../plugins/awilix.js';
import type { Logger } from 'pino';
import type { PreTokenGenerationEvent, Profile } from './event.js';

const logger = container.resolve<Logger>('logger');

const handler = async (event: PreTokenGenerationEvent, _context: any) => {
	logger.info(`preTokenGeneration > handler > in:${JSON.stringify(event)}`);

	// Integration test claims
	if (event.request.userAttributes?.profile ){
		const profile:Profile =JSON.parse(event.request.userAttributes.profile);
		if(profile?.isIntegrationTest === true){
			event.response = {
				claimsAndScopeOverrideDetails: {
					accessTokenGeneration: { 
						claimsToAddOrOverride:{
							email: event.request.userAttributes.email,
							userId: profile.idcUserId,
							isTest: profile.isIntegrationTest
						}
					 }, 
				}
			};
		}
	}
	
	logger.info(`preTokenGeneration > handler > exit:${JSON.stringify(event)}`);
	return event;
};

export { handler };
