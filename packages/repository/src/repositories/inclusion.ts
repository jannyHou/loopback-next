// RT means related repository's type
// T
// ID means source model's id type
import {Entity} from '../model';
import {Getter} from '@loopback/core';
import {
  Filter,
  Where,
  resolveHasManyMetadata,
  resolveBelongsToMetadata,
  RelationMetadata,
  RelationType,
  constrainWhere,
} from '../';
import {AnyObject} from '..';
import {DefaultCrudRepository} from './legacy-juggler-bridge';
import {inspect} from 'util';
import {ModelDefinition} from 'loopback-datasource-juggler';
import {
  HasManyDefinition,
  BelongsToDefinition,
  HasManyResolvedDefinition,
  BelongsToResolvedDefinition,
} from '../relations';

// // TE: the target entity
// // TID: the ID of target entity
// // SID: the ID of source entity
// export function InclusionHandlerFactory<TE extends Entity, TID, SID>(
//   targetRepoGetter: Getter<DefaultCrudRepository<TE, TID>>,
//   // to support composed fk, eventually the fkName should be an array
//   // fkNames: string[]
//   fkName: string,
// ) {
//   return async function inclusionHandler(
//     fk: SID,
//     // There are two concerns of the Filter interface
//     // 1st: the Filter interface doesn't provide the related model's
//     //      type for the inclusion filter, see my comment in query.ts
//     // 2nd: when apply the fk constraint on `where`, it doesn't recognize
//     //      the fkName as a property defined in the `where` filter,
//     //      but an arbitrary string instead. As a workaround I used
//     //      a loose type: Filter<TE & AnyObject>
//     filter?: Filter<TE & AnyObject>,
//   ): Promise<TE[]> {
//     const targetRepo = await targetRepoGetter();
//     filter = filter || {};
//     filter.where = filter.where || {};
//     filter.where[fkName] = fk;
//     // console.log(`inclusion filter: ${inspect(filter)}`);
//     return await targetRepo.find(filter);
//   };
// }

type ResolvedRelationMetadata =
  | HasManyResolvedDefinition
  | BelongsToResolvedDefinition;

export class InclusionHandler<SE extends Entity, SID> {
  _handlers: {[relation: string]: Function} = {};
  constructor(public sourceRepository: DefaultCrudRepository<SE, SID>) {}

  registerHandler<TE extends Entity, TID>(
    relationName: string,
    targetRepoGetter: Getter<DefaultCrudRepository<TE, TID>>,
  ) {
    this._handlers[relationName] = fetchIncludedItems;
    const self = this;

    async function fetchIncludedItems(
      fk: SID,
      filter?: Filter<TE>,
    ): Promise<TE[]> {
      const targetRepo = await targetRepoGetter();
      const relationDef: ResolvedRelationMetadata = self.getResolvedRelationDefinition(
        relationName,
      );
      filter = filter || {};
      filter.where = self.buildConstrainedWhere<TE>(
        fk,
        filter.where || {},
        relationDef,
      );
      // console.log(`inclusion filter: ${inspect(filter)}`);
      return await targetRepo.find(filter);
    }
  }

  findHandler(relationName: string) {
    const errMsg =
      `The inclusion handler for relation ${relationName} is not found!` +
      `Make sure you defined ${relationName} properly.`;

    return this._handlers[relationName] || new Error(errMsg);
  }

  buildConstrainedWhere<TE extends Entity>(
    id: SID,
    whereFilter: Where<TE>,
    relationDef: ResolvedRelationMetadata,
  ): Where<TE> {
    const keyPropName: string = relationDef.keyTo;
    const where: AnyObject = {};
    where[keyPropName] = id;
    return constrainWhere(whereFilter, where as Where<TE>);
  }

  getResolvedRelationDefinition(name: string): ResolvedRelationMetadata {
    const relationMetadata: RelationMetadata = this.sourceRepository.entityClass
      .definition.relations[name];

    switch (relationMetadata.type) {
      case RelationType.hasMany:
        return resolveHasManyMetadata(relationMetadata as HasManyDefinition);
      case RelationType.belongsTo:
        return resolveBelongsToMetadata(
          relationMetadata as BelongsToDefinition,
        );
      default:
        throw new Error(`Unsupported relation type ${relationMetadata.type}`);
    }
  }
}
