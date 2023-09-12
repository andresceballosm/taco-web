import { Cohort } from '../../src';
import { fakeUrsulas, makeCohort } from '../utils';
import { test } from 'vitest';

test('Cohort', () => {
  const mockedUrsulas = fakeUrsulas();

  test('creates a Cohort', async () => {
    const cohort = await makeCohort(mockedUrsulas);
    const expectedUrsulas = mockedUrsulas.map((u) => u.checksumAddress);
    expect(cohort.ursulaAddresses).toEqual(expectedUrsulas);
  });

  test('serializes to a plain object', async () => {
    const cohort = await makeCohort(mockedUrsulas);
    const asObj = cohort.toObj();
    const fromObj = Cohort.fromObj(asObj);
    expect(fromObj).toEqual(cohort);
  });

  test('serializes to JSON', async () => {
    const cohort = await makeCohort(mockedUrsulas);
    const asJson = cohort.toJSON();
    const fromJson = Cohort.fromJSON(asJson);
    expect(fromJson).toEqual(cohort);
  });
});
