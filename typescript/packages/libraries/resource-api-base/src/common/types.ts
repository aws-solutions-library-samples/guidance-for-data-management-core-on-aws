import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { TIntersect, TLiteral, TNull, TSchema, TUnion, Type, JsonTypeBuilder } from '@sinclair/typebox';
import type { FastifyInstance, FastifyBaseLogger, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerDefault } from 'fastify';
export const apiVersion100: string = '1.0.0';

export type FastifyTypebox = FastifyInstance<RawServerDefault, RawRequestDefaultExpression<RawServerDefault>, RawReplyDefaultExpression<RawServerDefault>, FastifyBaseLogger, TypeBoxTypeProvider>;

export type DynamoDbPaginationKey = { [key: string]: string } | undefined;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function stringEnum<T extends string[]>(values: [...T], description: string, defaultOption?: string) {
	return Type.Unsafe<T[number]>({ type: 'string', enum: values, description, default: defaultOption });
}

type IntoStringLiteralUnion<T> = { [K in keyof T]: T[K] extends string ? TLiteral<T[K]> : never };

export function convertFromTypeBoxIntersectToJSONSchema(intersectTypeBox: TIntersect): any {
	const schema = {
		'type': 'object',
		'properties': {},
		'required': []
	};
	const requiredSets = new Set<string>();

	for (const definition of intersectTypeBox.allOf) {
		for (const [key, value] of Object.entries(definition['properties'])) {
			schema.properties[key] = value;
		}

		if (definition.hasOwnProperty('required')) {
			for (const req of definition['required']) {
				requiredSets.add(req);
			}
		}
	}
	schema.required = Array.from(requiredSets);
	return schema;
}

export class OpenApiTypeBuilder extends JsonTypeBuilder {
	public Nullable<T extends TSchema>(schema: T): TUnion<[T, TNull]> {
		return { ...schema, nullable: true } as any;
	}

	public StringEnum<T extends string[]>(values: [...T]): TUnion<IntoStringLiteralUnion<T>> {
		return { enum: values } as any;
	}
}
