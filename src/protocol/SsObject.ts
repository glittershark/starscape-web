import { Lifetime } from '../core';
import { SsConnection } from './SsConnection';
import { SsProperty } from './SsProperty'
import { SsAction } from './SsAction'
import { SsSignal } from './SsSignal'
import { SsRequest } from './SsRequest'
import { SsValue } from './SsValue'

type Member<T> = new (...args: any[]) => T

/// A handle to an object on the server. Is automatically created by the connection.
export class SsObject {
  readonly lt = new Lifetime();
  private members = new Map<string, any>();

  constructor(
    readonly connection: SsConnection,
    readonly id: number
  ) {
    connection.lifetime().add(this.lt);
  }

  /// Object must have a property with the given name. This is not automatically checked.
  property(name: string): SsProperty {
    return this.member(
      name,
      SsProperty,
      () => new SsProperty(this, name),
    );
  }

  /// Object must have an action with the given name. This is not automatically checked.
  action(name: string): SsAction {
    return this.member(
      name,
      SsAction,
      () => new SsAction(this, name),
    );
  }

  /// Object must have an event with the given name. This is not automatically checked.
  signal(name: string): SsSignal {
    return this.member(
      name,
      SsSignal,
      () => new SsSignal(this, name),
    );
  }

  /// Used internally, Get or create a property, action or event
  private member<T>(name: string, memberClass: Member<T>, create: () => T): T {
    if (!this.lt.isAlive()) {
      throw new Error(
        this.id + '.' + name +
        ' can not be created since the object has been destroyed'
      );
    }
    let member = this.members.get(name);
    if (!member) {
      member = create();
      this.lt.add(member);
      this.members.set(name, member);
    } else if (!(member instanceof memberClass)) {
      throw new Error(
        this.id + '.' + name +
        ' can not be created as a ' + memberClass.name +
        ' because it was already created as a ' + member.constructor.name
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
    this.property(name).handleUpdate(value);
  }

  /// Called by the connection.
  handleGetReply(name: string, value: any) {
    this.property(name).handleGetReply(value);
  }

  /// Called by the connection.
  handleSignal(name: string, value: any) {
    this.signal(name).handleSignal(value);
  }

  dispose() {
    this.members.clear();
    this.lt.dispose();
  }
}

