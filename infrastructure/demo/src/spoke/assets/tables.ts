export interface Table {
	name: string;
	schema: string;
}

export const DATABASE_NAME = 'dm';
export const PRODUCT_TABLE_NAME = 'products';

const PRODUCT_SCHEMA = (tableName: string) => `CREATE TABLE ${DATABASE_NAME}.schemaName.${tableName} (\
    sku character varying(256) NOT NULL ENCODE lzo,\
	units numeric(16,4) ENCODE az64,\
	weight numeric(16,4) ENCODE az64,\
	cost numeric(16,4) ENCODE az64 \
) DISTSTYLE AUTO;`;

export const tableDefinitions: Table[] = [
	{
		name: PRODUCT_TABLE_NAME,
		schema: PRODUCT_SCHEMA(PRODUCT_TABLE_NAME),
	},
];
