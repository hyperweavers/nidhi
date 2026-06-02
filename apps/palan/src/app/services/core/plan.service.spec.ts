import { TestBed } from '@angular/core/testing';

jest.mock('../../db/app.db', () => ({
  db: {
    plan: {
      put: jest.fn().mockResolvedValue(undefined),
      orderBy: jest.fn(() => ({
        first: jest.fn().mockResolvedValue(undefined),
      })),
    },
    delete: jest.fn(),
    open: jest.fn(),
  },
}));

jest.mock('dexie', () => {
  const { of } = jest.requireActual('rxjs');
  return {
    liveQuery: jest.fn((fn) => {
      fn();
      return of(undefined);
    }),
    Observable: class {},
  };
});

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('generated-uuid') }));

import { v4 as uuid } from 'uuid';
import { db } from '../../db/app.db';
import { PlanService } from './plan.service';

describe('PlanService', () => {
  let service: PlanService;

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addOrUpdate', () => {
    it('should add a new plan with generated id when id is missing', async () => {
      const plan = {
        stock: { name: 'Test', vendorCode: { mc: { primary: 'TEST:US' } } },
        currencies: {
          purchase: { code: 'USD' },
          contribution: { code: 'USD' },
        },
      } as any;

      await service.addOrUpdate(plan);

      expect(uuid).toHaveBeenCalled();
      expect(db.plan.put).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'generated-uuid' }),
      );
    });

    it('should update existing plan when id is provided', async () => {
      const plan = {
        id: 'existing-id',
        stock: { name: 'Test', vendorCode: { mc: { primary: 'TEST:US' } } },
        currencies: {
          purchase: { code: 'USD' },
          contribution: { code: 'USD' },
        },
      } as any;

      await service.addOrUpdate(plan);

      expect(db.plan.put).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'existing-id' }),
      );
    });
  });
});
