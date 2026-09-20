import { v4 as uuid } from 'uuid';

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

// -- query text parser ------------------------------------------------------
// Inverse of serializeGroup/serializeCondition: rebuilds a QueryGroupNode
// from a stored query string (used when a screener has no queryTree, e.g.
// data saved before the tree was persisted). Property matching is greedy
// longest-first against the known properties, so names containing spaces,
// parens or words like AND/OR still resolve. Returns null when the text
// cannot be parsed (caller should fall back to manual rebuild).

interface QueryParserState {
  text: string;
  pos: number;
  /** Properties sorted longest-first for greedy matching. */
  properties: string[];
}

function parserSkipWs(state: QueryParserState): void {
  while (
    state.pos < state.text.length &&
    /\s/.test(state.text[state.pos] as string)
  ) {
    state.pos++;
  }
}

/** Matches a whole word keyword (AND / OR / NOT / IN) at the cursor. */
function parserMatchWord(state: QueryParserState, word: string): boolean {
  parserSkipWs(state);
  if (!state.text.startsWith(word, state.pos)) return false;
  const after = state.text[state.pos + word.length];
  if (after !== undefined && /[A-Za-z0-9_]/.test(after)) return false;
  state.pos += word.length;
  return true;
}

function parserPeek(state: QueryParserState): string | undefined {
  parserSkipWs(state);
  return state.text[state.pos];
}

/**
 * Matches the longest known property at the cursor. `allow` decides whether
 * the match may be used here, based on the text that follows it (guards
 * against accepting a prefix of a longer unknown word).
 */
function parserMatchProperty(
  state: QueryParserState,
  allow: (rest: string) => boolean,
): string | null {
  parserSkipWs(state);
  for (const prop of state.properties) {
    if (!state.text.startsWith(prop, state.pos)) continue;
    if (allow(state.text.slice(state.pos + prop.length))) {
      state.pos += prop.length;
      return prop;
    }
  }
  return null;
}

function parserMatchNumber(state: QueryParserState): string | null {
  parserSkipWs(state);
  const rest = state.text.slice(state.pos);
  const match = /^-?\d+(\.\d+)?/.exec(rest);
  if (!match) return null;
  state.pos += (match[0] as string).length;
  return match[0] as string;
}

/** True when `rest` (after an operand) can legally follow a value operand. */
function isOperandContinuation(rest: string): boolean {
  const next = rest.trimStart();
  if (!next) return true;
  const ch = next[0] as string;
  if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === ',')
    return true;
  if (ch === ')') return true;
  return (
    (next.startsWith('AND') &&
      (next.length === 3 || !/[A-Za-z0-9_]/.test(next[3] as string))) ||
    (next.startsWith('OR') &&
      (next.length === 2 || !/[A-Za-z0-9_]/.test(next[2] as string)))
  );
}

/** True when `rest` (after a condition property) starts a valid operator. */
function isOperatorContinuation(rest: string): boolean {
  const next = rest.trimStart();
  if (!next) return false;
  const ch = next[0] as string;
  if (ch === '>' || ch === '<' || ch === '=' || ch === '!') return true;
  return (
    next.startsWith('IN') &&
    (next.length === 2 || !/[A-Za-z0-9_]/.test(next[2] as string))
  );
}

function parserParseOperand(state: QueryParserState): string | null {
  const prop = parserMatchProperty(state, isOperandContinuation);
  if (prop !== null) return prop;
  const num = parserMatchNumber(state);
  if (num === null) return null;
  return isOperandContinuation(state.text.slice(state.pos)) ? num : null;
}

/** Parses a value: one operand or two joined by + - * /. */
function parserParseValue(state: QueryParserState): string | null {
  const left = parserParseOperand(state);
  if (left === null) return null;
  parserSkipWs(state);
  const op = state.text[state.pos];
  if (op === '+' || op === '-' || op === '*' || op === '/') {
    state.pos++;
    const right = parserParseOperand(state);
    if (right === null) return null;
    return `${normalizeOperand(left)} ${op} ${normalizeOperand(right)}`;
  }
  return normalizeOperand(left);
}

function parserParseCondition(
  state: QueryParserState,
): QueryConditionNode | null {
  let negated = false;
  const saved = state.pos;
  if (parserMatchWord(state, 'NOT')) {
    negated = true;
  } else {
    state.pos = saved;
  }

  const property = parserMatchProperty(state, isOperatorContinuation);
  if (property === null) return null;

  parserSkipWs(state);
  if (parserMatchWord(state, 'IN')) {
    parserSkipWs(state);
    if (state.text[state.pos] !== '(') return null;
    state.pos++;
    const items: string[] = [];
    for (;;) {
      const item = parserParseValue(state);
      if (item === null) return null;
      items.push(item);
      parserSkipWs(state);
      const sep = state.text[state.pos];
      if (sep === ',') {
        state.pos++;
        continue;
      }
      if (sep === ')') {
        state.pos++;
        break;
      }
      return null;
    }
    return {
      kind: 'condition',
      id: uuid(),
      property,
      operator: negated ? 'NOT IN' : 'IN',
      value: items.join(', '),
    };
  }

  const rest = state.text.slice(state.pos);
  let operator: QueryOperator | null = null;
  if (rest.startsWith('>=')) operator = '>=';
  else if (rest.startsWith('<=')) operator = '<=';
  else if (rest.startsWith('!=')) operator = '!=';
  else if (rest.startsWith('>')) operator = '>';
  else if (rest.startsWith('<')) operator = '<';
  else if (rest.startsWith('=')) operator = '=';
  if (operator === null) return null;
  state.pos += operator.length;

  const value = parserParseValue(state);
  if (value === null) return null;

  if (negated) {
    if (operator !== '=') return null;
    operator = '!=';
  }
  const node: QueryConditionNode = {
    kind: 'condition',
    id: uuid(),
    property,
    operator,
    value,
  };
  return isValidCondition(node, state.properties) ? node : null;
}

function parserParseGroup(state: QueryParserState): QueryGroupNode | null {
  const children: QueryNode[] = [];
  let combinator: QueryCombinator | null = null;
  for (;;) {
    const next = parserPeek(state);
    if (next === undefined || next === ')') break;
    let child: QueryNode | null;
    if (next === '(') {
      state.pos++;
      const inner = parserParseGroup(state);
      if (inner === null) return null;
      parserSkipWs(state);
      if (state.text[state.pos] !== ')') return null;
      state.pos++;
      child = inner;
    } else {
      child = parserParseCondition(state);
    }
    if (child === null) return null;
    children.push(child);
    const mark = state.pos;
    if (parserMatchWord(state, 'AND')) {
      combinator ??= 'AND';
    } else if (parserMatchWord(state, 'OR')) {
      combinator ??= 'OR';
    } else {
      state.pos = mark;
      break;
    }
    // A combinator must be followed by another item.
    const following = parserPeek(state);
    if (following === undefined || following === ')') return null;
  }
  if (children.length === 0) return null;
  return {
    kind: 'group',
    id: uuid(),
    combinator: combinator ?? 'AND',
    children,
  };
}

export function parseQueryText(
  raw: string,
  properties: readonly string[],
): QueryGroupNode | null {
  const text = raw.trim();
  if (!text || properties.length === 0) return null;
  const state: QueryParserState = {
    text,
    pos: 0,
    properties: [...properties].sort((a, b) => b.length - a.length),
  };
  const group = parserParseGroup(state);
  if (group === null) return null;
  parserSkipWs(state);
  if (state.pos !== state.text.length) return null;
  return isValidGroup(group, properties) ? group : null;
}
