// RT means related repository's type
// T
// ID means source model's id type
import {Entity} from '../model';
import {Getter, inject} from '@loopback/core';
import {Filter} from '../';
import {AnyObject} from '..';
import {DefaultCrudRepository} from './legacy-juggler-bridge';
import {inspect} from 'util';

// TE: the target entity
// TID: the ID of target entity
// SID: the ID of source entity
export function InclusionHandlerFactory<TE extends Entity, TID, SID>(
  targetRepoGetter: Getter<DefaultCrudRepository<TE, TID>>,
  // to support composed fk, eventually the fkName should be an array
  // fkNames: string[]
  fkName: string,
) {
  return async function inclusionHandler(
    fk: SID,
    // There are two concerns of the Filter interface
    // 1st: the Filter interface doesn't provide the related model's
    //      type for the inclusion filter, see my comment in query.ts
    // 2nd: when apply the fk constraint on `where`, it doesn't recognize
    //      the fkName as a property defined in the `where` filter,
    //      but an arbitrary string instead. As a workaround I used
    //      a loose type: Filter<TE & AnyObject>
    filter?: Filter<TE & AnyObject>,
  ): Promise<TE[]> {
    const targetRepo = await targetRepoGetter();
    filter = filter || {};
    filter.where = filter.where || {};
    filter.where[fkName] = fk;
    // console.log(`inclusion filter: ${inspect(filter)}`);
    return await targetRepo.find(filter);
  };
}
