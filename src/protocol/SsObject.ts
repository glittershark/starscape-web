import {
  DependentLifetime,
  RealTypeOf,
  runtimeTypeEquals,
  runtimeTypeName,
  indirectRuntimeType,
  messageFromError,
} from '../core';
import { SsConnection } from './SsConnection';
import { SsConduit } from './SsConduit'
import { SsProperty } from './SsProperty'
import { SsAction } from './SsAction'
import { SsSignal } from './SsSignal'
import { SsRequest } from './SsRequest'
import { SsValue, SsValueRuntimeType } from './SsValue'

type SsConduitConstructor<T extends SsConduit<any>> = new (...args: any[]) => T

function ssConduitConstructorTypeName(mc: SsConduitConstructor<any>): string {
  if (mc == SsProperty) {
    return 'property';
  } else if (mc == SsSignal) {
    return 'signal';
  } else if (mc == SsAction) {
    return 'action';
  } else {
    throw new Error('invalid member constructor: ' + mc.name);
  }
}

/// A handle to an object on the server. Is automatically created by the connection.
export class SsObject extends DependentLifetime {
  private members = new Map<string, SsConduit<any>>();

  constructor(
    readonly connection: SsConnection,
    readonly id: number
  ) {
    super();
    connection.addDependent(this);
  }

  /// Object must have a property with the given name. This is not automatically checked.
  property<R extends SsValueRuntimeType>(name: string, rtType: R): SsProperty<RealTypeOf<R>> {
    const existing = this.member<SsProperty<RealTypeOf<R>>>(name, SsProperty);
    if (existing === undefined) {
      const created = new SsProperty(this, name, indirectRuntimeType(rtType));
      this.members.set(name, created);
      return created;
    } else {
      if (!runtimeTypeEquals(existing.rtType, rtType)) {
        throw Error(
          this.id + '.' + name +
          ' can not be created with type ' +
          runtimeTypeName(rtType) +
          ' because it was already created with type ' +
          runtimeTypeName(existing.rtType)
        );
      }
      return existing;
    }
  }

  /// Object must have an action with the given name. This is not automatically checked.
  action<R extends SsValueRuntimeType>(name: string, rtType: R): SsAction<RealTypeOf<R>> {
    // _rtType is used only for type deduction
    const existing = this.member<SsAction<RealTypeOf<R>>>(name, SsAction);
    if (existing === undefined) {
      const created = new SsAction<RealTypeOf<R>>(this, name, indirectRuntimeType(rtType));
      this.members.set(name, created);
      return created;
    } else {
      if (!runtimeTypeEquals(existing.rtType, rtType)) {
        throw Error(
          this.id + '.' + name +
          ' can not be created with type ' +
          runtimeTypeName(rtType) +
          ' because it was already created with type ' +
          runtimeTypeName(existing.rtType)
        );
      }
      return existing;
    }
  }

  /// Object must have an event with the given name. This is not automatically checked.
  signal<R extends SsValueRuntimeType>(name: string, rtType: R): SsSignal<RealTypeOf<R>> {
    const existing = this.member<SsSignal<RealTypeOf<R>>>(name, SsSignal);
    if (existing === undefined) {
      const created = new SsSignal<any>(this, name, indirectRuntimeType(rtType));
      this.members.set(name, created);
      return created;
    } else {
      if (!runtimeTypeEquals(existing.rtType, rtType)) {
        throw Error(
          this.id + '.' + name +
          ' can not be created with type ' +
          runtimeTypeName(rtType) +
          ' because it was already created with type ' +
          runtimeTypeName(existing.rtType)
        );
      }
      return existing;
    }
  }

  /// Used internally, Get or create a property, action or event
  private member<T extends SsConduit<any>>(name: string, memberClass: SsConduitConstructor<T>): T | undefined {
    if (!this.alive()) {
      throw new Error(
        this.id + '.' + name +
        ' can not be created since the object has been destroyed'
      );
    }
    let member = this.members.get(name)!;
    if (member !== undefined && (
        !(member instanceof memberClass)
    )) {
      throw new Error(
        this.id + '.' + name +
        ' can not be created as a ' + ssConduitConstructorTypeName(memberClass) +
        ' because it was already created as a ' + member.typeName()
      );
    }
    return member;
  }

  /// Called by members
  makeRequest(rq: SsRequest) {
    this.connection.makeRequest(rq);
  }

  /// Called by the connection.
  handleUpdate(name: string, value: SsValue) {
    try {
      this.member(name, SsProperty)?.handleUpdate(value);
    } catch (e) {
      throw new Error(this.id + '.' + name + ' property: ' + messageFromError(e));
    }
  }

  /// Called by the connection.
  handleGetReply(name: string, value: SsValue) {
    try {
      this.member<any>(name, SsProperty)?.handleGetReply(value);
    } catch (e) {
      throw new Error(this.id + '.' + name + ' property: ' + messageFromError(e));
    }
  }

  /// Called by the connection.
  handleSignal(name: string, value: SsValue) {
    try {
      this.member<any>(name, SsSignal)?.handleSignal(value);
    } catch (e) {
      throw new Error(this.id + '.' + name + ' signal: ' + messageFromError(e));
    }
  }

  kill() {
    this.members.clear();
    super.kill();
  }
}

