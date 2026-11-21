export type QueryOperator =
  '>' | '<' | '>=' | '<=' | '=' | '!=' | 'IN' | 'NOT IN';

export const QUERY_OPERATORS: QueryOperator[] = [
  '>',
  '<',
  '>=',
  '<=',
  '=',
  '!=',
  'IN',
  'NOT IN',
];

export type QueryCombinator = 'AND' | 'OR';

export const QUERY_COMBINATORS: QueryCombinator[] = ['AND', 'OR'];

export type ArithmeticOperator = '+' | '-' | '*' | '/';

export const ARITHMETIC_OPERATORS: ArithmeticOperator[] = ['+', '-', '*', '/'];

/** Synthetic UI property. Serialized as Company ID for the screener API. */
export const COMPANY_NAME_PROPERTY = 'Company Name';
export const COMPANY_NAME_API_PROPERTY = 'Company ID';
export const COMPANY_NAME_OPERATORS: QueryOperator[] = ['=', 'IN', 'NOT IN'];

export interface CompanyNameValue {
  /** Friendly label shown in the builder and in the query preview. */
  label: string;
  /**
   * Resolved Company IDs: one for a selected company, many for a
   * portfolio/watch list. Overlaps are removed when the API query is serialized.
   */
  entityIds: string[];
}

export type QuerySerializationMode = 'api' | 'display';

export interface QueryConditionNode {
  kind: 'condition';
  id: string;
  property: string;
  operator: QueryOperator;
  /** Raw value text. For IN / NOT IN this is a comma-separated list of items. */
  value: string;
  /** Labels + Company IDs for COMPANY_NAME_PROPERTY, kept out of the emitted query. */
  companyNameValues?: CompanyNameValue[];
}

export interface QueryGroupNode {
  kind: 'group';
  id: string;
  combinator: QueryCombinator;
  children: QueryNode[];
}

export type QueryNode = QueryConditionNode | QueryGroupNode;

export interface QueryChange {
  /** Transformed query sent to the API and persisted with the screener. */
  query: string;
  /** Friendly labels for the read-only query preview. */
  displayQuery: string;
  isValid: boolean;
}

export const NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/;

export interface ValueExpression {
  valid: boolean;
  left: string;
  operator?: ArithmeticOperator;
  right?: string;
}

// -- query text parser ------------------------------------------------------
// Inverse of serializeGroup/serializeCondition: rebuilds a QueryGroupNode
// from a stored query string (used when a screener has no queryTree, e.g.
// data saved before the tree was persisted). Property matching is greedy
// longest-first against the known properties, so names containing spaces,
// parens or words like AND/OR still resolve. Returns null when the text
// cannot be parsed (caller should fall back to manual rebuild).

export interface QueryParserState {
  text: string;
  pos: number;
  /** Properties sorted longest-first for greedy matching. */
  properties: string[];
}
