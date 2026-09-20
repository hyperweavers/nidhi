import {
  QueryGroupNode,
  QueryOperator,
  buildQueryText,
  filterProperties,
  isNumericLiteral,
  isSingleOperand,
  isValidCondition,
  isValidConditionValue,
  isValidGroup,
  isValidListValue,
  normalizeOperand,
  parseQueryText,
  parseValueExpression,
  serializeCondition,
  serializeGroup,
  serializeValueExpression,
  splitListValue,
} from './query-builder';

const PROPS = ['Amount', 'Expected amount', 'Fiscal year'];

function groupWith(
  children: QueryGroupNode['children'],
  combinator: QueryGroupNode['combinator'] = 'AND',
): QueryGroupNode {
  return { kind: 'group', id: 'g1', combinator, children };
}

describe('query-builder model', () => {
  describe('isNumericLiteral', () => {
    it.each(['25500', '25.5', '-10', '-0.25', '25,500', '  500  ', '1,00,000'])(
      'accepts %s',
      (raw) => {
        expect(isNumericLiteral(raw)).toBe(true);
      },
    );

    it.each(['', '   ', 'abc', 'Amount', '12.3.4', '--5', '5-', '1,2,', '+'])(
      'rejects %s',
      (raw) => {
        expect(isNumericLiteral(raw)).toBe(false);
      },
    );
  });

  describe('isSingleOperand', () => {
    it('accepts known properties and numbers', () => {
      expect(isSingleOperand('Amount', PROPS)).toBe(true);
      expect(isSingleOperand('  Fiscal year  ', PROPS)).toBe(true);
      expect(isSingleOperand('25.5', PROPS)).toBe(true);
    });

    it('rejects unknown text and empties', () => {
      expect(isSingleOperand('Unknown', PROPS)).toBe(false);
      expect(isSingleOperand('', PROPS)).toBe(false);
      expect(isSingleOperand('amount', PROPS)).toBe(false);
    });
  });

  describe('parseValueExpression', () => {
    it('parses single operands', () => {
      expect(parseValueExpression('500', PROPS)).toEqual({
        valid: true,
        left: '500',
      });
      expect(parseValueExpression('Amount', PROPS)).toEqual({
        valid: true,
        left: 'Amount',
      });
    });

    it.each([
      ['Amount + 500', 'Amount', '+', '500'],
      ['Amount-500', 'Amount', '-', '500'],
      ['Amount * 1.5', 'Amount', '*', '1.5'],
      ['Amount / 2', 'Amount', '/', '2'],
      ['Amount + Expected amount', 'Amount', '+', 'Expected amount'],
      ['500 + 200', '500', '+', '200'],
      ['500 + -5', '500', '+', '-5'],
    ])('parses binary %s', (raw, left, operator, right) => {
      expect(parseValueExpression(raw, PROPS)).toEqual({
        valid: true,
        left,
        operator,
        right,
      });
    });

    it.each([
      '',
      '   ',
      'Amount +',
      '+ 500',
      'Unknown + 5',
      '1 + 2 + 3',
      'abc',
    ])('rejects %s', (raw) => {
      expect(parseValueExpression(raw, PROPS).valid).toBe(false);
    });
  });

  describe('normalizeOperand / serializeValueExpression', () => {
    it('strips comma formatting from numbers', () => {
      expect(normalizeOperand('25,500')).toBe('25500');
      expect(serializeValueExpression('25,500', PROPS)).toBe('25500');
    });

    it('normalizes spacing around the operator', () => {
      expect(serializeValueExpression('Amount+500', PROPS)).toBe(
        'Amount + 500',
      );
    });

    it('returns raw text for invalid expressions', () => {
      expect(serializeValueExpression('  nope +  ', PROPS)).toBe('nope +');
    });
  });

  describe('list values', () => {
    it('splits on commas and trims', () => {
      expect(splitListValue('10, 20 ,Amount')).toEqual(['10', '20', 'Amount']);
      expect(splitListValue('')).toEqual([]);
    });

    it('accepts valid item lists', () => {
      expect(isValidListValue('10, 20', PROPS)).toBe(true);
      expect(isValidListValue('Amount + 5, 20', PROPS)).toBe(true);
    });

    it.each(['', '10,', ',10', '10,,20', '10, abc'])(
      'rejects list %s',
      (raw) => {
        expect(isValidListValue(raw, PROPS)).toBe(false);
      },
    );

    it('validates by operator', () => {
      expect(isValidConditionValue('10, 20', 'IN', PROPS)).toBe(true);
      expect(isValidConditionValue('10', '=', PROPS)).toBe(true);
      expect(isValidConditionValue('10, 20', '=', PROPS)).toBe(false);
    });
  });

  describe('isValidCondition / isValidGroup', () => {
    it('accepts a complete condition', () => {
      expect(
        isValidCondition(
          {
            kind: 'condition',
            id: 'c',
            property: 'Amount',
            operator: '>',
            value: '5',
          },
          PROPS,
        ),
      ).toBe(true);
    });

    it('rejects unknown property, bad operator and bad value', () => {
      const base = {
        kind: 'condition',
        id: 'c',
        operator: '>',
        value: '5',
      } as const;
      expect(isValidCondition({ ...base, property: 'Nope' }, PROPS)).toBe(
        false,
      );
      expect(
        isValidCondition(
          {
            ...base,
            property: 'Amount',
            operator: 'LIKE' as unknown as QueryOperator,
          },
          PROPS,
        ),
      ).toBe(false);
      expect(
        isValidCondition({ ...base, property: 'Amount', value: 'abc' }, PROPS),
      ).toBe(false);
    });

    it('rejects empty groups and bubbles nested validity', () => {
      expect(isValidGroup(groupWith([]), PROPS)).toBe(false);
      expect(
        isValidGroup(
          groupWith([
            {
              kind: 'condition',
              id: 'c',
              property: 'Amount',
              operator: '=',
              value: '',
            },
          ]),
          PROPS,
        ),
      ).toBe(false);
      expect(
        isValidGroup(
          groupWith([
            {
              kind: 'group',
              id: 'g2',
              combinator: 'OR',
              children: [
                {
                  kind: 'condition',
                  id: 'c',
                  property: 'Amount',
                  operator: '=',
                  value: '1',
                },
              ],
            },
          ]),
          PROPS,
        ),
      ).toBe(true);
    });
  });

  describe('serializeCondition', () => {
    it.each([
      ['>', 'Amount > 500'],
      ['<', 'Amount < 500'],
      ['>=', 'Amount >= 500'],
      ['<=', 'Amount <= 500'],
      ['=', 'Amount = 500'],
    ])('serializes %s directly', (operator, expected) => {
      expect(
        serializeCondition(
          {
            kind: 'condition',
            id: 'c',
            property: 'Amount',
            operator: operator as QueryOperator,
            value: '500',
          },
          PROPS,
        ),
      ).toBe(expected);
    });

    it('rewrites != as NOT ... =', () => {
      expect(
        serializeCondition(
          {
            kind: 'condition',
            id: 'c',
            property: 'Amount',
            operator: '!=',
            value: '500',
          },
          PROPS,
        ),
      ).toBe('NOT Amount = 500');
    });

    it('serializes IN lists with parens', () => {
      expect(
        serializeCondition(
          {
            kind: 'condition',
            id: 'c',
            property: 'Amount',
            operator: 'IN',
            value: '10, 20',
          },
          PROPS,
        ),
      ).toBe('Amount IN (10, 20)');
    });

    it('rewrites NOT IN as NOT ... IN (...)', () => {
      expect(
        serializeCondition(
          {
            kind: 'condition',
            id: 'c',
            property: 'Amount',
            operator: 'NOT IN',
            value: '10, 20',
          },
          PROPS,
        ),
      ).toBe('NOT Amount IN (10, 20)');
    });

    it('serializes arithmetic values', () => {
      expect(
        serializeCondition(
          {
            kind: 'condition',
            id: 'c',
            property: 'Amount',
            operator: '>',
            value: 'Expected amount * 1.5',
          },
          PROPS,
        ),
      ).toBe('Amount > Expected amount * 1.5');
    });
  });

  describe('serializeGroup / buildQueryText', () => {
    it('joins top-level conditions without parens', () => {
      const group = groupWith([
        {
          kind: 'condition',
          id: 'a',
          property: 'Amount',
          operator: '=',
          value: '250000',
        },
        {
          kind: 'condition',
          id: 'b',
          property: 'Fiscal year',
          operator: '=',
          value: '175000',
        },
      ]);
      expect(serializeGroup(group, PROPS)).toBe(
        'Amount = 250000 AND Fiscal year = 175000',
      );
    });

    it('wraps nested groups in parens and honors OR', () => {
      const group = groupWith(
        [
          {
            kind: 'condition',
            id: 'a',
            property: 'Amount',
            operator: '=',
            value: '250000',
          },
          {
            kind: 'group',
            id: 'g2',
            combinator: 'OR',
            children: [
              {
                kind: 'condition',
                id: 'b',
                property: 'Fiscal year',
                operator: '=',
                value: '175000',
              },
              {
                kind: 'condition',
                id: 'c',
                property: 'Amount',
                operator: '<',
                value: '500',
              },
            ],
          },
        ],
        'AND',
      );
      expect(serializeGroup(group, PROPS)).toBe(
        'Amount = 250000 AND (Fiscal year = 175000 OR Amount < 500)',
      );
    });

    it('returns empty query when invalid', () => {
      const group = groupWith([
        { kind: 'condition', id: 'a', property: '', operator: '=', value: '' },
      ]);
      expect(buildQueryText(group, PROPS)).toEqual({
        query: '',
        isValid: false,
      });
    });

    it('returns the text query when valid', () => {
      const group = groupWith([
        {
          kind: 'condition',
          id: 'a',
          property: 'Amount',
          operator: '>',
          value: '25,500',
        },
      ]);
      expect(buildQueryText(group, PROPS)).toEqual({
        query: 'Amount > 25500',
        isValid: true,
      });
    });
  });

  describe('filterProperties', () => {
    const many = Array.from({ length: 100 }, (_, i) => `Prop ${i}`);

    it('returns everything (capped) on empty search', () => {
      expect(filterProperties(many, '')).toHaveLength(50);
    });

    it('matches case-insensitively', () => {
      expect(filterProperties(PROPS, 'amount')).toEqual([
        'Amount',
        'Expected amount',
      ]);
      expect(filterProperties(PROPS, 'FISCAL')).toEqual(['Fiscal year']);
    });
  });

  describe('all condition combinations', () => {
    it('serializes every operator with every value shape', () => {
      const cases: Array<[string, string, string, string]> = [
        ['>', '500', 'Amount', 'Amount > 500'],
        ['<', 'Amount', 'Amount', 'Amount < Amount'],
        ['>=', 'Amount + 1', 'Amount', 'Amount >= Amount + 1'],
        ['<=', '-12.5', 'Amount', 'Amount <= -12.5'],
        ['=', 'Expected amount', 'Amount', 'Amount = Expected amount'],
        [
          '!=',
          'Expected amount * 2',
          'Amount',
          'NOT Amount = Expected amount * 2',
        ],
        ['IN', '1, 2.5, Amount', 'Amount', 'Amount IN (1, 2.5, Amount)'],
        [
          'NOT IN',
          'Amount - 1, 0',
          'Fiscal year',
          'NOT Fiscal year IN (Amount - 1, 0)',
        ],
      ];
      for (const [operator, value, property, expected] of cases) {
        expect(
          serializeCondition(
            {
              kind: 'condition',
              id: 'c',
              property,
              operator: operator as QueryOperator,
              value,
            },
            PROPS,
          ),
        ).toBe(expected);
      }
    });

    it('serializes three-level nesting with mixed combinators', () => {
      const group = groupWith(
        [
          {
            kind: 'condition',
            id: 'a',
            property: 'Fiscal year',
            operator: '=',
            value: '2024',
          },
          {
            kind: 'group',
            id: 'g2',
            combinator: 'OR',
            children: [
              {
                kind: 'condition',
                id: 'b',
                property: 'Amount',
                operator: '!=',
                value: '0',
              },
              {
                kind: 'group',
                id: 'g3',
                combinator: 'AND',
                children: [
                  {
                    kind: 'condition',
                    id: 'c',
                    property: 'Expected amount',
                    operator: 'NOT IN',
                    value: '10, Amount + 5',
                  },
                  {
                    kind: 'condition',
                    id: 'd',
                    property: 'Amount',
                    operator: '>=',
                    value: 'Expected amount * 1.5',
                  },
                ],
              },
            ],
          },
        ],
        'AND',
      );
      expect(buildQueryText(group, PROPS)).toEqual({
        query:
          'Fiscal year = 2024 AND (NOT Amount = 0 OR ' +
          '(NOT Expected amount IN (10, Amount + 5) AND Amount >= Expected amount * 1.5))',
        isValid: true,
      });
    });

    it('wraps single-child groups and accepts single-item lists', () => {
      const group = groupWith([
        {
          kind: 'group',
          id: 'g2',
          combinator: 'OR',
          children: [
            {
              kind: 'condition',
              id: 'a',
              property: 'Amount',
              operator: 'IN',
              value: '7',
            },
          ],
        },
      ]);
      expect(buildQueryText(group, PROPS)).toEqual({
        query: '(Amount IN (7))',
        isValid: true,
      });
    });

    it('rejects trees with an empty nested group', () => {
      const group = groupWith([
        {
          kind: 'condition',
          id: 'a',
          property: 'Amount',
          operator: '>',
          value: '1',
        },
        { kind: 'group', id: 'g2', combinator: 'AND', children: [] },
      ]);
      expect(buildQueryText(group, PROPS)).toEqual({
        query: '',
        isValid: false,
      });
    });
  });

  describe('parseQueryText', () => {
    const PAREN_PROPS = [
      'Net Sales YoY Chg (%)',
      'Market Cap (Rs Cr)',
      'Price',
    ];

    function roundTrip(query: string, props: readonly string[] = PROPS) {
      const tree = parseQueryText(query, props);
      expect(tree).not.toBeNull();
      // Re-serializing the parsed tree reproduces the query text.
      expect(buildQueryText(tree as QueryGroupNode, props)).toEqual({
        query,
        isValid: true,
      });
      return tree as QueryGroupNode;
    }

    it('parses a simple condition for every operator', () => {
      roundTrip('Amount > 500');
      roundTrip('Amount < 500');
      roundTrip('Amount >= 500');
      roundTrip('Amount <= 500');
      roundTrip('Amount = 500');
      roundTrip('Amount = Expected amount');
      roundTrip('Amount IN (1, 2.5, Amount)');
      roundTrip('NOT Amount = 500');
      roundTrip('NOT Amount IN (10, 20)');
    });

    it('parses arithmetic and negative values', () => {
      roundTrip('Amount > Expected amount * 1.5');
      roundTrip('Amount <= -12.5');
      roundTrip('Amount >= Amount + 1');
    });

    it('parses AND/OR groups and nested parens', () => {
      const tree = roundTrip(
        'Fiscal year = 2024 AND (NOT Amount = 0 OR ' +
          '(NOT Expected amount IN (10, Amount + 5) AND Amount >= Expected amount * 1.5))',
      );
      expect(tree.children).toHaveLength(2);
      expect(tree.children[1]?.kind).toBe('group');
    });

    it('parses property names with spaces and parens', () => {
      const tree = roundTrip(
        'Net Sales YoY Chg (%) > 100 AND Market Cap (Rs Cr) <= 500',
        PAREN_PROPS,
      );
      expect(tree.children).toHaveLength(2);
    });

    it('parses a single-child nested group', () => {
      roundTrip('(Amount IN (7))');
    });

    it.each([
      '',
      '   ',
      'Amount',
      'Amount > ',
      'Amount >> 5',
      'Unknown > 5',
      'Amount > 5 AND',
      'AND Amount > 5',
      'Amount > 5 OR',
      '(Amount > 5',
      'Amount > 5)',
      '()',
      '(Amount > 5))',
      'Amount IN ()',
      'Amount IN (10,)',
      'Amount IN (10 AND 20)',
      'Amount > 5 6',
      'NOT Amount > 5',
      'NOT Unknown = 5',
    ])('returns null for invalid query %s', (query) => {
      expect(parseQueryText(query, PROPS)).toBeNull();
    });

    it('returns null without properties', () => {
      expect(parseQueryText('Amount > 5', [])).toBeNull();
    });

    it('round-trips a NOT IN value with an expression item', () => {
      roundTrip('NOT Fiscal year IN (Amount - 1, 0)');
    });
  });
});
