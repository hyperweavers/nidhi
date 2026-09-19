export type QueryOperator =
  | '>'
  | '<'
  | '>='
  | '<='
  | '='
  | '!='
  | 'IN'
  | 'NOT IN';

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

export interface QueryConditionNode {
  kind: 'condition';
  id: string;
  property: string;
  operator: QueryOperator;
  /** Raw value text. For IN / NOT IN this is a comma-separated list of items. */
  value: string;
}

export interface QueryGroupNode {
  kind: 'group';
  id: string;
  combinator: QueryCombinator;
  children: QueryNode[];
}

export type QueryNode = QueryConditionNode | QueryGroupNode;

export interface QueryChange {
  query: string;
  isValid: boolean;
}

const NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/;

function stripNumberFormatting(raw: string): string {
  return raw.replace(/[,\s]/g, '');
}

export function isNumericLiteral(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  // Reject malformed grouping and inner whitespace: "1,2,", "10, 20", "1 0".
  if (
    trimmed.startsWith(',') ||
    trimmed.endsWith(',') ||
    trimmed.includes(',,') ||
    /[\s]/.test(trimmed)
  ) {
    return false;
  }
  return NUMERIC_PATTERN.test(stripNumberFormatting(trimmed));
}

export function isPropertyOperand(
  raw: string,
  properties: readonly string[],
): boolean {
  return properties.includes(raw.trim());
}

export function isSingleOperand(
  raw: string,
  properties: readonly string[],
): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  return isPropertyOperand(trimmed, properties) || isNumericLiteral(trimmed);
}

export interface ValueExpression {
  valid: boolean;
  left: string;
  operator?: ArithmeticOperator;
  right?: string;
}

/**
 * Parses a single value expression: either one operand (property or number)
 * or two operands joined by a single binary arithmetic operator.
 * Property names from the screener mapping contain no + - * / , characters,
 * so operator splitting is unambiguous.
 */
export function parseValueExpression(
  raw: string,
  properties: readonly string[],
): ValueExpression {
  const trimmed = raw.trim();
  if (!trimmed) return { valid: false, left: trimmed };
  if (isSingleOperand(trimmed, properties)) {
    return { valid: true, left: trimmed };
  }

  for (let i = 1; i < trimmed.length; i++) {
    const ch = trimmed[i] as string;
    if (ch !== '+' && ch !== '-' && ch !== '*' && ch !== '/') {
      continue;
    }
    const left = trimmed.slice(0, i).trim();
    const right = trimmed.slice(i + 1).trim();
    if (!left || !right) continue;
    if (
      isSingleOperand(left, properties) &&
      isSingleOperand(right, properties)
    ) {
      return {
        valid: true,
        left,
        operator: ch as ArithmeticOperator,
        right,
      };
    }
  }

  return { valid: false, left: trimmed };
}

export function normalizeOperand(raw: string): string {
  const trimmed = raw.trim();
  if (isNumericLiteral(trimmed)) {
    return stripNumberFormatting(trimmed);
  }
  return trimmed;
}

export function serializeValueExpression(
  raw: string,
  properties: readonly string[],
): string {
  const parsed = parseValueExpression(raw, properties);
  if (!parsed.valid) return raw.trim();
  if (!parsed.operator) return normalizeOperand(parsed.left);
  return `${normalizeOperand(parsed.left)} ${parsed.operator} ${normalizeOperand(parsed.right ?? '')}`;
}

export function splitListValue(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function isValidListValue(
  raw: string,
  properties: readonly string[],
): boolean {
  const items = splitListValue(raw);
  if (items.length === 0) return false;
  // Reject trailing/leading/double commas: item count must match comma count + 1
  const commaCount = (raw.match(/,/g) ?? []).length;
  if (commaCount !== items.length - 1) return false;
  return items.every((item) => parseValueExpression(item, properties).valid);
}

export function isValidConditionValue(
  value: string,
  operator: QueryOperator,
  properties: readonly string[],
): boolean {
  if (operator === 'IN' || operator === 'NOT IN') {
    return isValidListValue(value, properties);
  }
  return parseValueExpression(value, properties).valid;
}

export function isValidCondition(
  condition: QueryConditionNode,
  properties: readonly string[],
): boolean {
  if (!QUERY_OPERATORS.includes(condition.operator)) return false;
  if (!isPropertyOperand(condition.property, properties)) return false;
  return isValidConditionValue(condition.value, condition.operator, properties);
}

export function isValidGroup(
  group: QueryGroupNode,
  properties: readonly string[],
): boolean {
  if (group.children.length === 0) return false;
  return group.children.every((child) =>
    child.kind === 'condition'
      ? isValidCondition(child, properties)
      : isValidGroup(child, properties),
  );
}

export function serializeCondition(
  condition: QueryConditionNode,
  properties: readonly string[],
): string {
  const property = condition.property.trim();
  if (condition.operator === '!=') {
    const value = serializeValueExpression(condition.value, properties);
    return `NOT ${property} = ${value}`;
  }
  if (condition.operator === 'NOT IN') {
    const items = splitListValue(condition.value).map((item) =>
      serializeValueExpression(item, properties),
    );
    return `NOT ${property} IN (${items.join(', ')})`;
  }
  if (condition.operator === 'IN') {
    const items = splitListValue(condition.value).map((item) =>
      serializeValueExpression(item, properties),
    );
    return `${property} IN (${items.join(', ')})`;
  }
  const value = serializeValueExpression(condition.value, properties);
  return `${property} ${condition.operator} ${value}`;
}

export function serializeGroup(
  group: QueryGroupNode,
  properties: readonly string[],
  isRoot = true,
): string {
  const parts: string[] = [];
  for (const child of group.children) {
    if (child.kind === 'condition') {
      parts.push(serializeCondition(child, properties));
    } else {
      parts.push(serializeGroup(child, properties, false));
    }
  }
  const joined = parts.join(` ${group.combinator} `);
  return isRoot ? joined : `(${joined})`;
}

/** Builds the emitted text query. Returns '' when the tree is not fully valid. */
export function buildQueryText(
  group: QueryGroupNode,
  properties: readonly string[],
): { query: string; isValid: boolean } {
  const isValid = isValidGroup(group, properties);
  if (!isValid) return { query: '', isValid: false };
  return { query: serializeGroup(group, properties, true), isValid: true };
}

export function filterProperties(
  properties: readonly string[],
  search: string,
  limit = 50,
): string[] {
  const q = search.trim().toLowerCase();
  if (!q) return [...properties].slice(0, limit);
  return properties.filter((p) => p.toLowerCase().includes(q)).slice(0, limit);
}
