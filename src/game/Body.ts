import { SsObject } from '../protocol'
import { Lifetime, MappingConduit } from '../core'
import { Game } from '../game'
import { Spatial } from './Spatial'
import { OrbitSpatial } from './OrbitSpatial'

export class Body {
  readonly name;
  readonly color;
  readonly size;
  private readonly spatialUserTracker;
  private cachedSpatial: Spatial | null = null;

  constructor(
    private readonly game: Game,
    readonly obj: SsObject,
  ) {
    this.name = obj.property('name', {nullable: String});
    this.color = new MappingConduit((lt: Lifetime, setter: (value: string) => void) => {
      setter('#ffffff');
      obj.property('color', String).subscribe(lt, color => {
        // Set color using a Starscape protocol color (starts with 0x...)
        setter('#' + color.slice(2));
      });
    })
    this.size = obj.property('size', Number);
    // Create the spatial when it is needed, clear it when all users are dead
    this.spatialUserTracker = new MappingConduit<void>((lt, _setter) => {
      this.cachedSpatial = new OrbitSpatial(this.game, lt, this);
      lt.addCallback(() => {
        this.cachedSpatial = null;
      });
    });
  }

  spatial(lt: Lifetime): Spatial {
    this.spatialUserTracker.subscribe(lt, () => {});
    // cache.spatial will always have a value when spatialUserTracker has subscribers
    return this.cachedSpatial!;
  }
}
