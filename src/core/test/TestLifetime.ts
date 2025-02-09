import { DependentLifetime, Lifetime } from '../Lifetime';

class MockDisposable {
  disposed = false;
  dispose() {
    if (this.disposed) {
      throw new Error('MockDisposable disposed twice');
    } else {
      this.disposed = true;
    }
  }
}

test('Lifetime disposes owned disposables', () => {
  const lt = new DependentLifetime();
  const a = lt.own(new MockDisposable());
  const b = lt.own(new MockDisposable());
  lt.kill();
  expect(a.disposed).toBe(true);
  expect(b.disposed).toBe(true);
});

test('DependentLifetime killed with parent', () => {
  const parent = new DependentLifetime();
  const lt = parent.newDependent();
  const a = lt.own(new MockDisposable());
  parent.kill();
  expect(a.disposed).toBe(true);
});

test('DependentLifetime can depend on multiple parents', () => {
  const parent1 = new DependentLifetime();
  const parent2 = new DependentLifetime();
  const lt = parent1.newDependent();
  parent2.addDependent(lt);
  const a = lt.own(new MockDisposable());
  parent2.kill();
  expect(a.disposed).toBe(true);
  parent1.kill();
});

test('Lifetime can have disposable disowned', () => {
  const lt = new DependentLifetime();
  const a = lt.own(new MockDisposable());
  lt.disown(a);
  lt.kill();
  expect(a.disposed).toBe(false);
});

test('Lifetime can not own new stuff after killed', () => {
  const lt = new DependentLifetime();
  lt.own(new MockDisposable());
  lt.kill();
  expect(() =>{
    lt.own(new MockDisposable());
  }).toThrow();
});

test('Lifetime can disown things after killed', () => {
  const lt = new DependentLifetime();
  const a = lt.own(new MockDisposable());
  lt.kill();
  lt.disown(a);
  lt.disown(new MockDisposable());
});

test('Lifetime can be killed multiple times', () => {
  const lt = new DependentLifetime();
  lt.own(new MockDisposable());
  lt.kill();
  lt.kill();
  lt.kill();
});

test('Lifetime reports dead after killed', () => {
  const lt = new DependentLifetime();
  expect(lt.alive()).toBe(true);
  lt.own(new MockDisposable());
  expect(lt.alive()).toBe(true);
  lt.kill();
  expect(lt.alive()).toBe(false);
  lt.kill();
  expect(lt.alive()).toBe(false);
});

test('Callback can be added', () => {
  const lt = new DependentLifetime();
  let called = 0;
  lt.addCallback(() => {
    called += 1;
  });
  expect(called).toBe(0);
  lt.kill();
  expect(called).toBe(1);
});

test('Callback added to multiple lifetimes only called once', () => {
  const lt0 = new DependentLifetime();
  const lt1 = new DependentLifetime();
  const lt2 = new DependentLifetime();
  let called = 0;
  Lifetime.addCallbackToAll([lt0, lt1, lt2], () => {
    called += 1;
  });
  expect(called).toBe(0);
  lt1.kill();
  expect(called).toBe(1);
  lt0.kill();
  expect(called).toBe(1);
  lt2.kill();
  expect(called).toBe(1);
});
